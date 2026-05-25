import { EventStore } from '../core/event';
import { Reducer, ReplayConfig, ReplayResult } from '../types';
export declare class ReplayEngine<S, E = unknown> {
    private readonly config;
    constructor(config: {
        initialState: S;
        reducer: Reducer<S, E>;
        eventStore: EventStore<E>;
    });
    replay(replayConfig?: ReplayConfig): ReplayResult<S>;
    replayTo(eventId: string): ReplayResult<S>;
    private selectEvents;
}
//# sourceMappingURL=replay-engine.d.ts.map