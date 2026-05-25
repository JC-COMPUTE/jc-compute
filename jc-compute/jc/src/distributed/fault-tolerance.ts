/**
 * Distributed Fault Tolerance
 *
 * Implements production-grade resilience patterns for JC Compute nodes:
 *
 *   1. Circuit Breaker   – prevent cascade failures to unreachable peers
 *   2. Retry with exponential backoff + jitter
 *   3. Partition detection & recovery using heartbeat / phi-accrual
 *   4. Anti-entropy reconciliation (Merkle-tree based sync gap detection)
 *   5. Graceful degradation to read-only mode under quorum loss
 */

import { EventEmitter } from 'events';
import { Event } from '../types';

// ── 1. Circuit Breaker ─────────────────────────────────────────────────────────

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;     // failures before opening
  successThreshold: number;     // successes in HALF_OPEN before closing
  timeoutMs: number;            // how long to stay OPEN before HALF_OPEN
  halfOpenMaxCalls: number;     // max probe calls in HALF_OPEN
}

const DEFAULT_CB_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeoutMs: 30_000,
  halfOpenMaxCalls: 3,
};

export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private halfOpenCalls = 0;
  private lastOpenedAt = 0;
  private readonly cfg: CircuitBreakerConfig;

  constructor(
    public readonly peerId: string,
    cfg: Partial<CircuitBreakerConfig> = {}
  ) {
    super();
    this.cfg = { ...DEFAULT_CB_CONFIG, ...cfg };
  }

  get currentState(): CircuitState { return this.state; }

  /** Returns true if the call should be allowed through */
  canCall(): boolean {
    if (this.state === 'CLOSED') return true;
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastOpenedAt >= this.cfg.timeoutMs) {
        this.transitionTo('HALF_OPEN');
        return this.halfOpenCalls < this.cfg.halfOpenMaxCalls;
      }
      return false;
    }
    // HALF_OPEN
    return this.halfOpenCalls < this.cfg.halfOpenMaxCalls;
  }

  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      this.halfOpenCalls++;
      if (this.successes >= this.cfg.successThreshold) {
        this.failures = 0;
        this.successes = 0;
        this.transitionTo('CLOSED');
      }
    } else {
      this.failures = 0;
    }
  }

  recordFailure(): void {
    this.failures++;
    if (this.state === 'HALF_OPEN') {
      this.transitionTo('OPEN');
    } else if (this.failures >= this.cfg.failureThreshold) {
      this.transitionTo('OPEN');
    }
  }

  private transitionTo(next: CircuitState): void {
    const prev = this.state;
    this.state = next;
    if (next === 'OPEN') this.lastOpenedAt = Date.now();
    if (next === 'HALF_OPEN') { this.halfOpenCalls = 0; this.successes = 0; }
    this.emit('stateChange', { from: prev, to: next, peerId: this.peerId });
  }
}

// ── 2. Retry with exponential backoff + full jitter ───────────────────────────

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
}

const DEFAULT_RETRY: RetryOptions = {
  maxAttempts: 5,
  baseDelayMs: 100,
  maxDelayMs: 30_000,
  jitter: true,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: Partial<RetryOptions> = {},
  onAttempt?: (attempt: number, err: unknown) => void
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY, ...opts };
  let lastErr: unknown;

  for (let attempt = 1; attempt <= cfg.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      onAttempt?.(attempt, err);
      if (attempt === cfg.maxAttempts) break;

      const exponential = Math.min(cfg.baseDelayMs * 2 ** (attempt - 1), cfg.maxDelayMs);
      const delay = cfg.jitter
        ? Math.random() * exponential   // full jitter
        : exponential;

      await sleep(delay);
    }
  }

  throw lastErr;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── 3. Phi-Accrual Failure Detector ───────────────────────────────────────────

/**
 * Phi-Accrual detector inspired by Akka's implementation.
 *
 * phi(t) = -log10(P_later(t))
 *
 * A phi > threshold (typically 8-16) indicates a suspected failure.
 * Unlike fixed-timeout detectors this adapts to measured heartbeat intervals.
 */
export class PhiAccrualDetector {
  private intervals: number[] = [];
  private lastHeartbeat = 0;
  private readonly maxHistory: number;
  private readonly minStdDevMs: number;

  constructor(opts: { maxHistory?: number; minStdDevMs?: number } = {}) {
    this.maxHistory = opts.maxHistory ?? 200;
    this.minStdDevMs = opts.minStdDevMs ?? 200;
  }

  heartbeat(): void {
    const now = Date.now();
    if (this.lastHeartbeat > 0) {
      this.intervals.push(now - this.lastHeartbeat);
      if (this.intervals.length > this.maxHistory) {
        this.intervals.shift();
      }
    }
    this.lastHeartbeat = now;
  }

  phi(now = Date.now()): number {
    if (this.lastHeartbeat === 0 || this.intervals.length < 2) return 0;
    const elapsed = now - this.lastHeartbeat;
    const mean = this.mean();
    const stddev = Math.max(this.stddev(), this.minStdDevMs);
    const y = (elapsed - mean) / stddev;
    // CDF approximation: P(X > elapsed) ≈ 1 - Φ(y)
    const prob = Math.max(1e-300, 1 - normalCDF(y));
    return -Math.log10(prob);
  }

  isSuspected(threshold = 8): boolean {
    return this.phi() > threshold;
  }

  private mean(): number {
    return this.intervals.reduce((a, b) => a + b, 0) / this.intervals.length;
  }

  private stddev(): number {
    const m = this.mean();
    const variance = this.intervals.reduce((a, x) => a + (x - m) ** 2, 0) / this.intervals.length;
    return Math.sqrt(variance);
  }
}

/** Approximation of the standard normal CDF */
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const pdf = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly;
  return x >= 0 ? cdf : 1 - cdf;
}

// ── 4. Anti-entropy: Merkle-tree based sync gap detection ─────────────────────

/**
 * Lightweight ordered Merkle tree over an event log.
 *
 * The root hash changes whenever any event is added.  Two nodes with
 * identical root hashes are guaranteed to have identical event sets
 * (given collision-resistant sha256).
 *
 * Bisection protocol:
 *   1. Exchange root hashes.
 *   2. If equal → in sync.
 *   3. If different → bisect: exchange hashes for halves.
 *   4. Recurse into differing halves.
 *   5. Exchange missing events.
 */
import * as crypto from 'crypto';

export class MerkleEventLog<E> {
  private readonly events: Array<{ id: string; hash: string }> = [];

  append(eventId: string, eventHash: string): void {
    this.events.push({ id: eventId, hash: eventHash });
  }

  /** SHA-256 of all event hashes concatenated in order */
  rootHash(): string {
    if (this.events.length === 0) return '0'.repeat(64);
    return this.rangeHash(0, this.events.length - 1);
  }

  rangeHash(from: number, to: number): string {
    const slice = this.events.slice(from, to + 1).map(e => e.hash).join('');
    return crypto.createHash('sha256').update(slice).digest('hex');
  }

  length(): number { return this.events.length; }

  eventAt(i: number): { id: string; hash: string } | undefined {
    return this.events[i];
  }

  /**
   * Return the indices of events that the remote is missing,
   * given the remote's event id set.
   */
  missingFrom(remoteIds: Set<string>): number[] {
    const missing: number[] = [];
    for (let i = 0; i < this.events.length; i++) {
      if (!remoteIds.has(this.events[i].id)) missing.push(i);
    }
    return missing;
  }
}

// ── 5. Quorum tracker & read-only mode guard ──────────────────────────────────

export interface QuorumConfig {
  totalNodes: number;
  quorumSize: number;   // minimum for write operations
}

export class QuorumTracker {
  private liveNodes = new Set<string>();
  private readonly cfg: QuorumConfig;

  constructor(cfg: QuorumConfig) {
    this.cfg = cfg;
  }

  markAlive(nodeId: string): void  { this.liveNodes.add(nodeId); }
  markDead(nodeId: string): void   { this.liveNodes.delete(nodeId); }

  hasWriteQuorum(): boolean {
    return this.liveNodes.size >= this.cfg.quorumSize;
  }

  hasReadQuorum(): boolean {
    // Read quorum = any majority (floor(n/2)+1)
    return this.liveNodes.size >= Math.floor(this.cfg.totalNodes / 2) + 1;
  }

  liveCount(): number { return this.liveNodes.size; }

  /**
   * Guard: throw if write quorum is not available.
   * Call before any state-mutating operation in a distributed context.
   */
  assertWriteQuorum(): void {
    if (!this.hasWriteQuorum()) {
      throw new Error(
        `Write quorum unavailable: ${this.liveCount()} of ${this.cfg.totalNodes} nodes live ` +
        `(need ${this.cfg.quorumSize}). Node is in read-only mode.`
      );
    }
  }
}

// ── 6. Partition-aware SyncManager wrapper ────────────────────────────────────

export interface FaultTolerantSyncConfig<E> {
  nodeId: string;
  quorum: QuorumConfig;
  retryOpts?: Partial<RetryOptions>;
  cbConfig?: Partial<CircuitBreakerConfig>;
  phiThreshold?: number;
}

export class FaultTolerantSync<E> extends EventEmitter {
  private readonly quorum: QuorumTracker;
  private readonly breakers = new Map<string, CircuitBreaker>();
  private readonly detectors = new Map<string, PhiAccrualDetector>();
  private readonly retryOpts: Partial<RetryOptions>;
  private readonly cbConfig: Partial<CircuitBreakerConfig>;
  private readonly phiThreshold: number;
  readonly nodeId: string;

  constructor(cfg: FaultTolerantSyncConfig<E>) {
    super();
    this.nodeId    = cfg.nodeId;
    this.quorum    = new QuorumTracker(cfg.quorum);
    this.retryOpts = cfg.retryOpts ?? {};
    this.cbConfig  = cfg.cbConfig  ?? {};
    this.phiThreshold = cfg.phiThreshold ?? 8;
  }

  /** Register a peer node */
  registerPeer(peerId: string): void {
    this.breakers.set(peerId, new CircuitBreaker(peerId, this.cbConfig));
    this.detectors.set(peerId, new PhiAccrualDetector());
    this.quorum.markAlive(peerId);
  }

  /** Record a heartbeat from a peer */
  heartbeatFrom(peerId: string): void {
    this.detectors.get(peerId)?.heartbeat();
    this.quorum.markAlive(peerId);
  }

  /** Check and update suspected peers */
  checkSuspects(): string[] {
    const suspected: string[] = [];
    for (const [peerId, detector] of this.detectors) {
      if (detector.isSuspected(this.phiThreshold)) {
        suspected.push(peerId);
        this.quorum.markDead(peerId);
        this.emit('suspectedFailure', { peerId, phi: detector.phi() });
      }
    }
    return suspected;
  }

  /** Send events to a peer with circuit-breaker + retry */
  async sendToPeer(
    peerId: string,
    events: Event<E>[],
    transport: (peerId: string, events: Event<E>[]) => Promise<void>
  ): Promise<void> {
    const breaker = this.breakers.get(peerId);
    if (!breaker) throw new Error(`Unknown peer: ${peerId}`);

    if (!breaker.canCall()) {
      this.emit('circuitOpen', { peerId, state: breaker.currentState });
      return; // graceful degradation: skip this peer
    }

    await withRetry(
      async () => {
        await transport(peerId, events);
        breaker.recordSuccess();
      },
      this.retryOpts,
      (attempt, err) => {
        this.emit('retryAttempt', { peerId, attempt, err });
        if (attempt === (this.retryOpts.maxAttempts ?? 5)) {
          breaker.recordFailure();
        }
      }
    );
  }

  /** Guard writes with quorum check */
  assertWriteQuorum(): void {
    this.quorum.assertWriteQuorum();
  }

  get quorumState() {
    return {
      live: this.quorum.liveCount(),
      hasWrite: this.quorum.hasWriteQuorum(),
      hasRead: this.quorum.hasReadQuorum(),
    };
  }
}
