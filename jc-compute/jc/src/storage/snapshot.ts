import * as crypto from 'crypto';
import { Snapshot } from '../types';

export class SnapshotStore<S = unknown> {
  private snapshots: Snapshot<S>[] = [];

  save(snapshot: Snapshot<S>): void {
    this.snapshots.push(Object.freeze({ ...snapshot }));
  }

  create(stateAtEventId: string, state: S): Snapshot<S> {
    const snapshot: Snapshot<S> = {
      stateAtEventId,
      state,
      timestamp: Date.now(),
      hash: this.hashState(state)
    };
    this.save(snapshot);
    return snapshot;
  }

  latest(): Snapshot<S> | null {
    return this.snapshots[this.snapshots.length - 1] ?? null;
  }

  at(eventId: string): Snapshot<S> | null {
    return this.snapshots.find(snapshot => snapshot.stateAtEventId === eventId) ?? null;
  }

  all(): Snapshot<S>[] {
    return [...this.snapshots];
  }

  clear(): void {
    this.snapshots = [];
  }

  private hashState(state: S): string {
    return crypto.createHash('sha256').update(JSON.stringify(state)).digest('hex');
  }
}
