import { Event, MergeResult, Reducer } from '../types';
export declare class MergeSemantics {
    static causalOrder<E>(events: Event<E>[]): Event<E>[];
    static merge<S, E>(baseState: S, incomingEvents: Event<E>[], reducer: Reducer<S, E>): MergeResult<S>;
}
//# sourceMappingURL=merge-semantics.d.ts.map