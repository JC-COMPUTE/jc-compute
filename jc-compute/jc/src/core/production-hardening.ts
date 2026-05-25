/**
 * Production Hardening
 *
 * Fills the following production gaps:
 *
 *   1. Structured health-check endpoint (readiness / liveness probes)
 *   2. Prometheus-compatible metrics counters and histograms
 *   3. Graceful shutdown with drain period
 *   4. Bounded event-store growth (configurable retention / snapshot policy)
 *   5. Panic recovery wrapper – reducers must not crash the process
 *   6. Memory-pressure guard – warn and pause ingestion above threshold
 */

import { EventEmitter } from 'events';
import { Event, Reducer } from '../types';

// ── 1. Health check ────────────────────────────────────────────────────────────

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheck {
  name: string;
  check: () => Promise<{ status: HealthStatus; details?: string }>;
}

export interface HealthReport {
  status: HealthStatus;
  checks: Record<string, { status: HealthStatus; details?: string; latencyMs: number }>;
  timestamp: number;
}

export class HealthMonitor {
  private readonly checks: HealthCheck[] = [];

  register(check: HealthCheck): void {
    this.checks.push(check);
  }

  async report(): Promise<HealthReport> {
    const results: HealthReport['checks'] = {};
    let overall: HealthStatus = 'healthy';

    for (const check of this.checks) {
      const start = Date.now();
      let result: { status: HealthStatus; details?: string };
      try {
        result = await check.check();
      } catch (err) {
        result = { status: 'unhealthy', details: String(err) };
      }
      results[check.name] = { ...result, latencyMs: Date.now() - start };

      if (result.status === 'unhealthy') overall = 'unhealthy';
      else if (result.status === 'degraded' && overall !== 'unhealthy') overall = 'degraded';
    }

    return { status: overall, checks: results, timestamp: Date.now() };
  }
}

// ── 2. Metrics ─────────────────────────────────────────────────────────────────

export class Counter {
  private value = 0;
  constructor(public readonly name: string, public readonly help: string) {}
  inc(by = 1): void { this.value += by; }
  get(): number { return this.value; }
  toPrometheus(): string {
    return `# HELP ${this.name} ${this.help}\n# TYPE ${this.name} counter\n${this.name} ${this.value}`;
  }
}

export class Histogram {
  private readonly buckets: Map<number, number>;    // upper bound → count
  private sum = 0;
  private count = 0;

  constructor(
    public readonly name: string,
    public readonly help: string,
    boundaries: number[] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
  ) {
    this.buckets = new Map(boundaries.sort((a, b) => a - b).map(b => [b, 0]));
  }

  observe(value: number): void {
    this.sum += value;
    this.count++;
    for (const [bound] of this.buckets) {
      if (value <= bound) this.buckets.set(bound, this.buckets.get(bound)! + 1);
    }
  }

  toPrometheus(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} histogram`];
    for (const [bound, cnt] of this.buckets) {
      lines.push(`${this.name}_bucket{le="${bound}"} ${cnt}`);
    }
    lines.push(`${this.name}_bucket{le="+Inf"} ${this.count}`);
    lines.push(`${this.name}_sum ${this.sum}`);
    lines.push(`${this.name}_count ${this.count}`);
    return lines.join('\n');
  }
}

export class MetricsRegistry {
  private readonly counters   = new Map<string, Counter>();
  private readonly histograms = new Map<string, Histogram>();

  counter(name: string, help: string): Counter {
    if (!this.counters.has(name)) this.counters.set(name, new Counter(name, help));
    return this.counters.get(name)!;
  }

  histogram(name: string, help: string, boundaries?: number[]): Histogram {
    if (!this.histograms.has(name)) this.histograms.set(name, new Histogram(name, help, boundaries));
    return this.histograms.get(name)!;
  }

  /** Render all metrics in Prometheus text format */
  render(): string {
    return [
      ...[...this.counters.values()].map(c => c.toPrometheus()),
      ...[...this.histograms.values()].map(h => h.toPrometheus()),
    ].join('\n\n');
  }
}

// ── 3. Graceful shutdown ───────────────────────────────────────────────────────

export class GracefulShutdown extends EventEmitter {
  private isShuttingDown = false;
  private readonly handlers: Array<() => Promise<void>> = [];
  private readonly drainMs: number;

  constructor(drainMs = 30_000) {
    super();
    this.drainMs = drainMs;
  }

  /** Register a shutdown handler (called in registration order) */
  onShutdown(handler: () => Promise<void>): void {
    this.handlers.push(handler);
  }

  /** Install OS signal handlers for SIGTERM and SIGINT */
  install(): void {
    const shutdown = (signal: string) => async () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      this.emit('shuttingDown', { signal });
      console.log(`[jc-compute] Received ${signal}. Draining for ${this.drainMs}ms...`);

      const drainTimeout = setTimeout(() => {
        console.error('[jc-compute] Drain timeout exceeded. Forcing exit.');
        process.exit(1);
      }, this.drainMs);
      drainTimeout.unref?.();

      try {
        for (const handler of this.handlers) {
          await handler();
        }
        clearTimeout(drainTimeout);
        this.emit('shutdown');
        process.exit(0);
      } catch (err) {
        console.error('[jc-compute] Error during shutdown:', err);
        process.exit(1);
      }
    };

    process.on('SIGTERM', shutdown('SIGTERM'));
    process.on('SIGINT',  shutdown('SIGINT'));
  }

  get shuttingDown(): boolean { return this.isShuttingDown; }
}

// ── 4. Bounded event-store retention ─────────────────────────────────────────

export interface RetentionPolicy {
  maxEvents: number;          // hard cap on in-memory events
  snapshotEvery: number;      // take a snapshot every N events
  pruneAfterSnapshot: boolean; // discard pre-snapshot events from memory
}

export interface SnapshotEntry<S> {
  state: S;
  atEventIndex: number;
  atEventId: string;
  takenAt: number;
}

export class RetentionManager<S, E> {
  private snapshots: SnapshotEntry<S>[] = [];
  private readonly policy: RetentionPolicy;

  constructor(policy: Partial<RetentionPolicy> = {}) {
    this.policy = {
      maxEvents: 100_000,
      snapshotEvery: 1_000,
      pruneAfterSnapshot: false,
      ...policy,
    };
  }

  /** Called after every event append; returns true if a snapshot should be taken */
  shouldSnapshot(eventCount: number): boolean {
    return eventCount > 0 && eventCount % this.policy.snapshotEvery === 0;
  }

  /** Returns true if the store is over the hard cap */
  isOverCapacity(eventCount: number): boolean {
    return eventCount > this.policy.maxEvents;
  }

  recordSnapshot(snapshot: SnapshotEntry<S>): void {
    this.snapshots.push(snapshot);
  }

  latestSnapshot(): SnapshotEntry<S> | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  get pruneAfterSnapshot(): boolean { return this.policy.pruneAfterSnapshot; }
}

// ── 5. Panic-safe reducer wrapper ────────────────────────────────────────────

/**
 * Wrap a reducer so that unhandled exceptions are caught and a fallback state
 * is returned (with an error event emitted for observability).
 */
export function safeReducer<S, E>(
  reducer: Reducer<S, E>,
  onError: (err: unknown, event: Event<E>, state: S) => void
): Reducer<S, E> {
  return (state, event, context) => {
    try {
      return reducer(state, event, context);
    } catch (err) {
      onError(err, event, state);
      return state; // return previous state unchanged; event is still logged
    }
  };
}

// ── 6. Memory-pressure guard ─────────────────────────────────────────────────

export interface MemoryGuardConfig {
  heapUsedWarnRatio: number;    // warn at this fraction of heapTotal (e.g., 0.80)
  heapUsedPauseRatio: number;   // pause ingestion above this (e.g., 0.95)
  checkIntervalMs: number;
}

export class MemoryGuard extends EventEmitter {
  private paused = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly cfg: MemoryGuardConfig;

  constructor(cfg: Partial<MemoryGuardConfig> = {}) {
    super();
    this.cfg = {
      heapUsedWarnRatio: 0.80,
      heapUsedPauseRatio: 0.95,
      checkIntervalMs: 5_000,
      ...cfg,
    };
  }

  start(): void {
    this.timer = setInterval(() => this.check(), this.cfg.checkIntervalMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  get isPaused(): boolean { return this.paused; }

  private check(): void {
    const mem = process.memoryUsage();
    const ratio = mem.heapUsed / mem.heapTotal;

    if (ratio >= this.cfg.heapUsedPauseRatio) {
      if (!this.paused) {
        this.paused = true;
        this.emit('pause', { ratio, heapUsed: mem.heapUsed, heapTotal: mem.heapTotal });
      }
    } else {
      if (this.paused) {
        this.paused = false;
        this.emit('resume', { ratio });
      }
      if (ratio >= this.cfg.heapUsedWarnRatio) {
        this.emit('warn', { ratio, heapUsed: mem.heapUsed, heapTotal: mem.heapTotal });
      }
    }
  }
}
