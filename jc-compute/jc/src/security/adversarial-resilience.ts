/**
 * Runtime Adversarial Resilience
 *
 * Defends the JC Compute event pipeline against:
 *
 *   1. Event replay attacks (stale signed events re-submitted)
 *   2. Oversized / malformed payload injection (DoS)
 *   3. Prototype pollution via event payloads
 *   4. Rate limiting per principal (token bucket)
 *   5. Equivocation (conflicting events from same principal at same tick)
 *   6. Time-based attacks (future timestamps, timestamp regression)
 */

import * as crypto from 'crypto';
import { Event } from '../types';

// ── 1. Replay-attack nonce cache ───────────────────────────────────────────────

export class NonceCache {
  private readonly buckets = new Map<number, Set<string>>();
  private readonly windowMs: number;
  private readonly bucketSizeMs: number;
  private readonly maxNoncesPerBucket: number;

  constructor(opts: { windowMs?: number; bucketSizeMs?: number; maxNoncesPerBucket?: number } = {}) {
    this.windowMs           = opts.windowMs           ?? 5 * 60_000;
    this.bucketSizeMs       = opts.bucketSizeMs       ?? 30_000;
    this.maxNoncesPerBucket = opts.maxNoncesPerBucket ?? 10_000;
  }

  private bucket(ts: number): number {
    return Math.floor(ts / this.bucketSizeMs);
  }

  checkAndRegister(eventId: string, timestamp: number): boolean {
    const now = Date.now();
    if (Math.abs(now - timestamp) > this.windowMs) return false;
    const b = this.bucket(timestamp);
    if (!this.buckets.has(b)) this.buckets.set(b, new Set());
    const bucket = this.buckets.get(b)!;
    if (bucket.has(eventId)) return false;
    if (bucket.size >= this.maxNoncesPerBucket) return false;
    bucket.add(eventId);
    this.evictExpired(now);
    return true;
  }

  private evictExpired(now: number): void {
    const minBucket = this.bucket(now - this.windowMs);
    for (const b of this.buckets.keys()) {
      if (b < minBucket) this.buckets.delete(b);
    }
  }
}

// ── 2. Payload sanitizer ───────────────────────────────────────────────────────

export interface SanitizerConfig {
  maxPayloadBytes: number;
  maxEventIdLength: number;
  maxStringValueLength: number;
  maxNestingDepth: number;
  forbiddenKeys: string[];
}

const DEFAULT_SANITIZER: SanitizerConfig = {
  maxPayloadBytes: 64 * 1024,
  maxEventIdLength: 128,
  maxStringValueLength: 8192,
  maxNestingDepth: 10,
  forbiddenKeys: ['__proto__', 'constructor', 'prototype', 'toString', 'valueOf'],
};

export class PayloadSanitizer {
  private readonly cfg: SanitizerConfig;

  constructor(cfg: Partial<SanitizerConfig> = {}) {
    this.cfg = { ...DEFAULT_SANITIZER, ...cfg };
  }

  validate<T>(event: Event<T>): string[] {
    const errors: string[] = [];
    if (!event.id || event.id.length > this.cfg.maxEventIdLength) {
      errors.push(`Event id must be 1-${this.cfg.maxEventIdLength} chars`);
    }
    const payloadStr = JSON.stringify(event.payload);
    if (payloadStr.length > this.cfg.maxPayloadBytes) {
      errors.push(`Payload exceeds ${this.cfg.maxPayloadBytes} byte limit`);
    }
    errors.push(...this.deepCheck(event.payload, 0));
    if (event.metadata) errors.push(...this.deepCheck(event.metadata, 0));
    return errors;
  }

  private deepCheck(value: unknown, depth: number): string[] {
    if (depth > this.cfg.maxNestingDepth) {
      return [`Object nesting exceeds max depth of ${this.cfg.maxNestingDepth}`];
    }
    if (value === null || typeof value !== 'object') {
      if (typeof value === 'string' && value.length > this.cfg.maxStringValueLength) {
        return [`String value exceeds ${this.cfg.maxStringValueLength} chars`];
      }
      return [];
    }
    const errors: string[] = [];
    for (const key of Object.keys(value as object)) {
      if (this.cfg.forbiddenKeys.includes(key)) {
        errors.push(`Forbidden key: "${key}" (prototype pollution vector)`);
      }
      errors.push(...this.deepCheck((value as Record<string, unknown>)[key], depth + 1));
    }
    return errors;
  }

  sanitize<T>(payload: T): T {
    return this.deepSanitize(payload, 0) as T;
  }

  private deepSanitize(value: unknown, depth: number): unknown {
    if (depth > this.cfg.maxNestingDepth) return null;
    if (value === null || typeof value !== 'object') {
      if (typeof value === 'string') return value.slice(0, this.cfg.maxStringValueLength);
      return value;
    }
    if (Array.isArray(value)) return value.map(v => this.deepSanitize(v, depth + 1));
    const out: Record<string, unknown> = Object.create(null);
    for (const key of Object.keys(value as object)) {
      if (this.cfg.forbiddenKeys.includes(key)) continue;
      out[key] = this.deepSanitize((value as Record<string, unknown>)[key], depth + 1);
    }
    return out;
  }
}

// ── 3. Rate limiter (token bucket per principal) ───────────────────────────────

export interface RateLimitConfig {
  capacity: number;
  refillRatePerMs: number;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly cfg: RateLimitConfig;

  constructor(cfg: RateLimitConfig = { capacity: 100, refillRatePerMs: 0.1 }) {
    this.cfg = cfg;
  }

  consume(principal: string, tokens = 1): boolean {
    const now = Date.now();
    if (!this.buckets.has(principal)) {
      this.buckets.set(principal, { tokens: this.cfg.capacity, lastRefill: now });
    }
    const bucket = this.buckets.get(principal)!;
    const elapsed = now - bucket.lastRefill;
    bucket.tokens = Math.min(this.cfg.capacity, bucket.tokens + elapsed * this.cfg.refillRatePerMs);
    bucket.lastRefill = now;
    if (bucket.tokens < tokens) return false;
    bucket.tokens -= tokens;
    return true;
  }

  evict(olderThanMs = 10 * 60_000): void {
    const cutoff = Date.now() - olderThanMs;
    for (const [principal, bucket] of this.buckets) {
      if (bucket.lastRefill < cutoff) this.buckets.delete(principal);
    }
  }
}

// ── 4. Equivocation detector ───────────────────────────────────────────────────

export class EquivocationDetector {
  private readonly seen = new Map<string, Map<string, string>>();

  record(principal: string, tick: string, eventId: string): string | null {
    if (!this.seen.has(principal)) this.seen.set(principal, new Map());
    const ticks = this.seen.get(principal)!;
    const existing = ticks.get(tick);
    if (existing !== undefined && existing !== eventId) return existing;
    ticks.set(tick, eventId);
    return null;
  }
}

// ── 5. Timestamp validator ─────────────────────────────────────────────────────

export interface TimestampPolicy {
  maxFutureMs: number;
  maxPastMs: number;
}

export class TimestampValidator {
  private readonly policy: TimestampPolicy;

  constructor(policy: Partial<TimestampPolicy> = {}) {
    this.policy = { maxFutureMs: 10_000, maxPastMs: 5 * 60_000, ...policy };
  }

  validate(timestamp: number | undefined, now = Date.now()): string | null {
    if (timestamp === undefined) return null;
    if (timestamp > now + this.policy.maxFutureMs) {
      return `Timestamp ${timestamp} is too far in the future`;
    }
    if (timestamp < now - this.policy.maxPastMs) {
      return `Timestamp ${timestamp} is too old`;
    }
    return null;
  }
}

// ── 6. Unified adversarial validation pipeline ────────────────────────────────

export interface ValidationOutcome {
  allowed: boolean;
  errors: string[];
  rateLimited: boolean;
  replayAttack: boolean;
  equivocation: string | null;
}

export class AdversarialValidator<T> {
  private readonly sanitizer: PayloadSanitizer;
  private readonly rateLimiter: RateLimiter;
  private readonly tsValidator: TimestampValidator;
  private readonly nonceCache: NonceCache;
  private readonly equivocation: EquivocationDetector;
  private readonly rejectOnRateLimit: boolean;

  constructor(cfg: {
    sanitizer?: Partial<SanitizerConfig>;
    rateLimiter?: RateLimitConfig;
    timestampPolicy?: Partial<TimestampPolicy>;
    nonce?: { windowMs?: number; maxNoncesPerBucket?: number };
    rejectOnRateLimit?: boolean;
  } = {}) {
    this.sanitizer         = new PayloadSanitizer(cfg.sanitizer);
    this.rateLimiter       = new RateLimiter(cfg.rateLimiter);
    this.tsValidator       = new TimestampValidator(cfg.timestampPolicy);
    this.nonceCache        = new NonceCache(cfg.nonce);
    this.equivocation      = new EquivocationDetector();
    this.rejectOnRateLimit = cfg.rejectOnRateLimit ?? true;
  }

  validate(event: Event<T>): ValidationOutcome {
    const errors: string[] = [];
    let rateLimited = false;
    let replayAttack = false;
    let equivocationConflict: string | null = null;

    errors.push(...this.sanitizer.validate(event));

    if (event.timestamp !== undefined) {
      const tsErr = this.tsValidator.validate(event.timestamp);
      if (tsErr) errors.push(tsErr);
      const fresh = this.nonceCache.checkAndRegister(event.id, event.timestamp);
      if (!fresh) {
        replayAttack = true;
        errors.push(`Replay attack: event id "${event.id}" already seen`);
      }
    }

    const principal = event.principal ?? 'anonymous';
    if (!this.rateLimiter.consume(principal)) {
      rateLimited = true;
      if (this.rejectOnRateLimit) errors.push(`Rate limit exceeded for principal "${principal}"`);
    }

    const tick = (event.metadata?.tick as string | undefined) ?? event.timestamp?.toString();
    if (tick && event.principal) {
      equivocationConflict = this.equivocation.record(event.principal, tick, event.id);
      if (equivocationConflict) {
        errors.push(
          `Equivocation: "${event.principal}" emitted conflicting events ` +
          `"${event.id}" vs "${equivocationConflict}" at tick ${tick}`
        );
      }
    }

    return { allowed: errors.length === 0, errors, rateLimited, replayAttack, equivocation: equivocationConflict };
  }
}
