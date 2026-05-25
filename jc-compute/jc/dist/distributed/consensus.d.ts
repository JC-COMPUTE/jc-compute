import { JCCompute } from '../core/execution';
import { Event, Reducer, VerificationResult } from '../types';
import { SyncManager } from './synchronization';
export declare class DistributedNode<S, E = unknown> {
    readonly engine: JCCompute<S, E>;
    readonly sync: SyncManager<E>;
    constructor(config: {
        nodeId: string;
        initialState: S;
        reducer: Reducer<S, E>;
    });
    emit(event: Event<E>): S;
    merge(events: Event<E>[]): number;
    verifyWith(peer: DistributedNode<S, E>): VerificationResult;
}
//# sourceMappingURL=consensus.d.ts.map