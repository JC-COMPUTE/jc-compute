import { Event, MergeResult, Reducer } from '../types';

export class MergeSemantics {
  static causalOrder<E>(events: Event<E>[]): Event<E>[] {
    return [...events].sort((a, b) => {
      const timeA = a.timestamp ?? 0;
      const timeB = b.timestamp ?? 0;
      if (timeA !== timeB) return timeA - timeB;
      return a.id.localeCompare(b.id);
    });
  }

  static merge<S, E>(
    baseState: S,
    incomingEvents: Event<E>[],
    reducer: Reducer<S, E>
  ): MergeResult<S> {
    let finalState = baseState;
    const conflicts: string[] = [];
    let eventsApplied = 0;

    for (const event of this.causalOrder(incomingEvents)) {
      try {
        finalState = reducer(finalState, event, {
          previousState: finalState,
          currentEventId: event.id,
          capability: event.capability,
          principal: event.principal
        });
        eventsApplied += 1;
      } catch (error) {
        conflicts.push(`Event ${event.id}: ${String(error)}`);
      }
    }

    return {
      success: conflicts.length === 0,
      eventsApplied,
      conflicts,
      finalState
    };
  }
}
