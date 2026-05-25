"use strict";
/**
 * Execution Engine - Deterministic state transformation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JCCompute = void 0;
const event_1 = require("./event");
const causal_graph_1 = require("./causal-graph");
/**
 * JCCompute - Main execution engine
 */
class JCCompute {
    constructor(config) {
        this.subscribers = new Set();
        this.reducer = config.reducer;
        this.initialState = config.initialState;
        this.currentState = config.initialState;
        this.eventStore = new event_1.EventStore();
        this.causalGraph = new causal_graph_1.CausalGraph();
    }
    /**
     * Emit an event and update state
     */
    emit(event) {
        // Validate event structure
        if (!event_1.EventValidator.validateStructure(event)) {
            throw new Error('Invalid event structure');
        }
        // Validate causal references
        if (!event_1.EventValidator.validateCausalReferences(event, this.eventStore)) {
            throw new Error('Causal references do not exist in event store');
        }
        // Build causal graph edges
        if (event.parentEventId) {
            this.causalGraph.addEdge(event.parentEventId, event.id);
        }
        if (event.parentEventIds) {
            for (const parentId of event.parentEventIds) {
                this.causalGraph.addEdge(parentId, event.id);
            }
        }
        // Append to event store
        this.eventStore.append(event);
        // Create execution context
        const context = {
            previousState: this.currentState,
            currentEventId: event.id,
            capability: event.capability,
            principal: event.principal
        };
        // Apply reducer
        try {
            this.currentState = this.reducer(this.currentState, event, context);
        }
        catch (error) {
            throw new Error(`Reducer failed for event ${event.id}: ${error}`);
        }
        // Notify subscribers
        this.notifySubscribers();
        return this.currentState;
    }
    /**
     * Get current state
     */
    getState() {
        return this.currentState;
    }
    /**
     * Get event history
     */
    getHistory() {
        return this.eventStore.readAll();
    }
    /**
     * Get the append-only event store for integration layers.
     */
    getEventStore() {
        return this.eventStore;
    }
    /**
     * Check if an event exists in history.
     */
    hasEvent(eventId) {
        return this.eventStore.has(eventId);
    }
    /**
     * Replay from history to verify consistency
     */
    replay(untilEventId) {
        let state = this.initialState;
        const history = this.eventStore.readAll();
        for (const event of history) {
            const context = {
                previousState: state,
                currentEventId: event.id,
                capability: event.capability,
                principal: event.principal
            };
            state = this.reducer(state, event, context);
            if (untilEventId && event.id === untilEventId) {
                break;
            }
        }
        return state;
    }
    /**
     * Verify execution integrity
     */
    verify() {
        try {
            const replayed = this.replay();
            return JSON.stringify(replayed) === JSON.stringify(this.currentState);
        }
        catch {
            return false;
        }
    }
    /**
     * Get causal graph
     */
    getCausalGraph() {
        return this.causalGraph;
    }
    /**
     * Check if two events are causally ordered
     */
    isOrdered(eventA, eventB) {
        return this.causalGraph.isOrdered(eventA, eventB);
    }
    /**
     * Subscribe to state changes
     */
    subscribe(handler) {
        this.subscribers.add(handler);
        return () => this.subscribers.delete(handler);
    }
    /**
     * Notify all subscribers of state change
     */
    notifySubscribers() {
        for (const subscriber of this.subscribers) {
            try {
                subscriber(this.currentState);
            }
            catch (error) {
                console.error('Subscriber error:', error);
            }
        }
    }
    /**
     * Clear history and reset to initial state
     */
    reset() {
        this.currentState = this.initialState;
        this.eventStore.clear();
        this.causalGraph.clear();
        this.notifySubscribers();
    }
    /**
     * Export state and history for persistence
     */
    export() {
        return {
            state: this.currentState,
            history: this.eventStore.readAll(),
            timestamp: Date.now()
        };
    }
    /**
     * Import state and history from export
     */
    import(data) {
        this.reset();
        for (const event of data.history) {
            // Emit without the new state (since we're replaying)
            this.emit(event);
        }
        // Verify the imported state matches
        if (JSON.stringify(data.state) !== JSON.stringify(this.currentState)) {
            throw new Error('Imported state does not match replayed state');
        }
    }
}
exports.JCCompute = JCCompute;
//# sourceMappingURL=execution.js.map