/**
 * Execution Engine - Deterministic state transformation
 */
import { Event, Reducer } from '../types';
import { EventStore } from './event';
import { CausalGraph } from './causal-graph';
/**
 * JCCompute - Main execution engine
 */
export declare class JCCompute<S, E = any> {
    private reducer;
    private initialState;
    private currentState;
    private eventStore;
    private causalGraph;
    private subscribers;
    constructor(config: {
        reducer: Reducer<S, E>;
        initialState: S;
    });
    /**
     * Emit an event and update state
     */
    emit(event: Event<E>): S;
    /**
     * Get current state
     */
    getState(): S;
    /**
     * Get event history
     */
    getHistory(): Event<E>[];
    /**
     * Get the append-only event store for integration layers.
     */
    getEventStore(): EventStore<E>;
    /**
     * Check if an event exists in history.
     */
    hasEvent(eventId: string): boolean;
    /**
     * Replay from history to verify consistency
     */
    replay(untilEventId?: string): S;
    /**
     * Verify execution integrity
     */
    verify(): boolean;
    /**
     * Get causal graph
     */
    getCausalGraph(): CausalGraph;
    /**
     * Check if two events are causally ordered
     */
    isOrdered(eventA: string, eventB: string): boolean;
    /**
     * Subscribe to state changes
     */
    subscribe(handler: (state: S) => void): () => void;
    /**
     * Notify all subscribers of state change
     */
    private notifySubscribers;
    /**
     * Clear history and reset to initial state
     */
    reset(): void;
    /**
     * Export state and history for persistence
     */
    export(): {
        state: S;
        history: Event<E>[];
        timestamp: number;
    };
    /**
     * Import state and history from export
     */
    import(data: {
        state: S;
        history: Event<E>[];
    }): void;
}
//# sourceMappingURL=execution.d.ts.map