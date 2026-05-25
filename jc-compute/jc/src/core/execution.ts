/**
 * Execution Engine - Deterministic state transformation
 */

import { Event, ExecutionContext, Reducer } from '../types';
import { EventStore, EventValidator } from './event';
import { CausalGraph } from './causal-graph';

/**
 * JCCompute - Main execution engine
 */
export class JCCompute<S, E = any> {
  private reducer: Reducer<S, E>;
  private initialState: S;
  private currentState: S;
  private eventStore: EventStore<E>;
  private causalGraph: CausalGraph;
  private subscribers: Set<(state: S) => void> = new Set();

  constructor(config: {
    reducer: Reducer<S, E>;
    initialState: S;
  }) {
    this.reducer = config.reducer;
    this.initialState = config.initialState;
    this.currentState = config.initialState;
    this.eventStore = new EventStore();
    this.causalGraph = new CausalGraph();
  }

  /**
   * Emit an event and update state
   */
  emit(event: Event<E>): S {
    // Validate event structure
    if (!EventValidator.validateStructure(event)) {
      throw new Error('Invalid event structure');
    }

    // Validate causal references
    if (!EventValidator.validateCausalReferences(event, this.eventStore)) {
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
    const context: ExecutionContext<S> = {
      previousState: this.currentState,
      currentEventId: event.id,
      capability: event.capability,
      principal: event.principal
    };

    // Apply reducer
    try {
      this.currentState = this.reducer(this.currentState, event, context);
    } catch (error) {
      throw new Error(`Reducer failed for event ${event.id}: ${error}`);
    }

    // Notify subscribers
    this.notifySubscribers();

    return this.currentState;
  }

  /**
   * Get current state
   */
  getState(): S {
    return this.currentState;
  }

  /**
   * Get event history
   */
  getHistory(): Event<E>[] {
    return this.eventStore.readAll();
  }

  /**
   * Get the append-only event store for integration layers.
   */
  getEventStore(): EventStore<E> {
    return this.eventStore;
  }

  /**
   * Check if an event exists in history.
   */
  hasEvent(eventId: string): boolean {
    return this.eventStore.has(eventId);
  }

  /**
   * Replay from history to verify consistency
   */
  replay(untilEventId?: string): S {
    let state = this.initialState;
    const history = this.eventStore.readAll();

    for (const event of history) {
      const context: ExecutionContext<S> = {
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
  verify(): boolean {
    try {
      const replayed = this.replay();
      return JSON.stringify(replayed) === JSON.stringify(this.currentState);
    } catch {
      return false;
    }
  }

  /**
   * Get causal graph
   */
  getCausalGraph(): CausalGraph {
    return this.causalGraph;
  }

  /**
   * Check if two events are causally ordered
   */
  isOrdered(eventA: string, eventB: string): boolean {
    return this.causalGraph.isOrdered(eventA, eventB);
  }

  /**
   * Subscribe to state changes
   */
  subscribe(handler: (state: S) => void): () => void {
    this.subscribers.add(handler);
    return () => this.subscribers.delete(handler);
  }

  /**
   * Notify all subscribers of state change
   */
  private notifySubscribers(): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(this.currentState);
      } catch (error) {
        console.error('Subscriber error:', error);
      }
    }
  }

  /**
   * Clear history and reset to initial state
   */
  reset(): void {
    this.currentState = this.initialState;
    this.eventStore.clear();
    this.causalGraph.clear();
    this.notifySubscribers();
  }

  /**
   * Export state and history for persistence
   */
  export(): {
    state: S;
    history: Event<E>[];
    timestamp: number;
  } {
    return {
      state: this.currentState,
      history: this.eventStore.readAll(),
      timestamp: Date.now()
    };
  }

  /**
   * Import state and history from export
   */
  import(data: { state: S; history: Event<E>[] }): void {
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
