import { JCCompute } from '../core/execution';
import { Event, Reducer, VerificationResult } from '../types';
import { SyncManager } from './synchronization';

export class DistributedNode<S, E = unknown> {
  readonly engine: JCCompute<S, E>;
  readonly sync: SyncManager<E>;

  constructor(config: {
    nodeId: string;
    initialState: S;
    reducer: Reducer<S, E>;
  }) {
    this.engine = new JCCompute<S, E>({
      initialState: config.initialState,
      reducer: config.reducer
    });
    this.sync = new SyncManager<E>({
      nodeId: config.nodeId,
      eventStore: this.engine.getEventStore()
    });
  }

  emit(event: Event<E>): S {
    return this.engine.emit(event);
  }

  merge(events: Event<E>[]): number {
    let applied = 0;
    for (const event of events) {
      if (this.engine.hasEvent(event.id)) continue;
      this.engine.emit(event);
      applied += 1;
    }
    return applied;
  }

  verifyWith(peer: DistributedNode<S, E>): VerificationResult {
    const localState = JSON.stringify(this.engine.getState());
    const peerState = JSON.stringify(peer.engine.getState());
    return {
      verified: this.engine.verify() && peer.engine.verify(),
      statesMatch: localState === peerState,
      errors: localState === peerState ? [] : ['Node states differ']
    };
  }
}
