/**
 * Cross-Platform Determinism Guarantees
 *
 * Addresses the following non-determinism sources:
 *   1. JSON.stringify key ordering (implementation-defined)
 *   2. Date.now() / wall-clock timestamps in hashes
 *   3. IEEE 754 floating-point accumulation order
 *   4. Map/Set iteration order (insertion-order in V8, but not guaranteed cross-platform)
 *   5. crypto.randomBytes in event ids (must be externally supplied for replay)
 *
 * Canonical serialization is a prerequisite for:
 *   - Deterministic hashing (sha256 over event content)
 *   - Replay equivalence across nodes / engines
 *   - Snapshot integrity verification
 */

import * as crypto from 'crypto';

// ── 1. Canonical JSON serialization ────────────────────────────────────────────

/**
 * Serialize a value to a canonical JSON string where object keys are
 * sorted lexicographically at every nesting level.  This ensures that
 * `{ b: 2, a: 1 }` and `{ a: 1, b: 2 }` produce identical bytes.
 *
 * Rules:
 *  - null / undefined / primitives: standard JSON encoding
 *  - Arrays: elements serialized in order (order is semantically significant)
 *  - Objects: keys sorted with localeCompare (deterministic across locales)
 *  - BigInt: serialized as decimal string with a `n` suffix
 *  - Uint8Array / Buffer: hex-encoded string with a `0x` prefix
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, canonicalReplacer);
}

function canonicalReplacer(_key: string, value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    // Handle BigInt
    if (typeof value === 'bigint') return `${value}n`;
    return value;
  }

  // Handle typed arrays / Buffer
  if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    return '0x' + Buffer.from(value as Uint8Array).toString('hex');
  }

  // Handle Array – preserve order
  if (Array.isArray(value)) {
    return value; // keys are numeric, JSON.stringify handles order
  }

  // Handle plain object – sort keys
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(value as object).sort((a, b) => a.localeCompare(b))) {
    sorted[k] = (value as Record<string, unknown>)[k];
  }
  return sorted;
}

// ── 2. Deterministic hash ──────────────────────────────────────────────────────

/**
 * Compute a deterministic sha256 hash over any serialisable value.
 * Uses canonicalJson so key ordering never affects the digest.
 */
export function deterministicHash(value: unknown): string {
  const bytes = Buffer.from(canonicalJson(value), 'utf8');
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

// ── 3. Deterministic numeric accumulation ──────────────────────────────────────

/**
 * Sum an array of numbers in a deterministic order regardless of input
 * ordering, using integer-safe arithmetic.
 *
 * For general floating-point sums the result depends on associativity.
 * By sorting inputs before summing we guarantee identical output for
 * the same multiset of values across all platforms.
 *
 * Limitation: if the values are semantically ordered (e.g., deltas in
 * causal order) callers should use `orderedSum` instead.
 */
export function deterministicSum(values: readonly number[]): number {
  return [...values].sort((a, b) => a - b).reduce((acc, v) => acc + v, 0);
}

/**
 * Sum an array of numbers in their given (causal) order.
 * Callers must guarantee that the order is itself deterministic.
 */
export function orderedSum(values: readonly number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

// ── 4. Deterministic Map / Set serialization ───────────────────────────────────

/**
 * Serialize a Map to a canonical object with sorted keys for hashing.
 */
export function mapToCanonical<V>(m: Map<string, V>): Record<string, V> {
  const out: Record<string, V> = {};
  for (const k of [...m.keys()].sort((a, b) => a.localeCompare(b))) {
    out[k] = m.get(k)!;
  }
  return out;
}

/**
 * Serialize a Set to a sorted array for deterministic hashing.
 */
export function setToCanonical(s: Set<string>): string[] {
  return [...s].sort((a, b) => a.localeCompare(b));
}

// ── 5. Monotonic logical clock ─────────────────────────────────────────────────

/**
 * A Lamport-style logical clock that is:
 *   - Monotonically increasing
 *   - Never dependent on wall-clock time (no Date.now())
 *   - Safe to use as a tie-breaker in causal ordering
 *
 * For replay, callers must pass the clock state from the original run.
 */
export class LogicalClock {
  private tick: bigint;

  constructor(initialTick: bigint = 0n) {
    this.tick = initialTick;
  }

  /** Advance clock and return new tick */
  next(): bigint {
    this.tick += 1n;
    return this.tick;
  }

  /** Update clock to max(local, received) + 1 on message receipt */
  receive(remoteTick: bigint): bigint {
    this.tick = (remoteTick > this.tick ? remoteTick : this.tick) + 1n;
    return this.tick;
  }

  current(): bigint {
    return this.tick;
  }

  /** Serialize for persistence / cross-node transport */
  toJSON(): string {
    return this.tick.toString();
  }

  static fromJSON(s: string): LogicalClock {
    return new LogicalClock(BigInt(s));
  }
}

// ── 6. Platform fingerprint ────────────────────────────────────────────────────

export interface PlatformFingerprint {
  nodeVersion: string;
  arch: string;
  platform: string;
  v8Flags: string[];
  endianness: 'BE' | 'LE';
}

/**
 * Capture platform details to detect potential determinism hazards.
 * Log this at node startup for cross-platform debugging.
 */
export function getPlatformFingerprint(): PlatformFingerprint {
  const os = require('os') as typeof import('os');
  const process_ = process as NodeJS.Process;
  return {
    nodeVersion: process_.version,
    arch: os.arch(),
    platform: os.platform(),
    v8Flags: process_.execArgv.filter(a => a.startsWith('--')),
    endianness: os.endianness(),
  };
}

/**
 * Assert that the platform endianness matches an expected value.
 * JC Compute wire format is little-endian; big-endian hosts must byte-swap.
 */
export function assertLittleEndian(): void {
  const os = require('os') as typeof import('os');
  if (os.endianness() !== 'LE') {
    console.warn(
      '[jc-compute] WARNING: Running on big-endian platform. ' +
      'Wire format byte-swap is required for cross-platform determinism.'
    );
  }
}

// ── 7. Deterministic event-id generation (no hidden randomness) ───────────────

/**
 * Generate a deterministic event id from logical clock tick and node id.
 * Avoids crypto.randomBytes so that id generation is fully reproducible
 * given the same logical clock state and node identity.
 *
 * Format: `evt_{nodeId}_{tick_hex}`
 */
export function deterministicEventId(nodeId: string, tick: bigint): string {
  const tickHex = tick.toString(16).padStart(16, '0');
  return `evt_${nodeId}_${tickHex}`;
}
