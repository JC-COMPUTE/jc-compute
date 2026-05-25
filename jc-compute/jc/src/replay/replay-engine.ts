import { EventStore } from '../core/event';
import { Event, Reducer, ReplayConfig, ReplayResult } from '../types';
import { ReplayVerifier } from './verification';

export class ReplayEngine<S, E = unknown> {
  constructor(
    private readonly config: {
      initialState: S;
      reducer: Reducer<S, E>;
      eventStore: EventStore<E>;
    }
  ) {}

  replay(replayConfig: ReplayConfig = {}): ReplayResult<S> {
    const events = this.selectEvents(replayConfig);
    let state = this.config.initialState;
    let lastEventId: string | undefined;

    for (const event of events) {
      state = this.config.reducer(state, event, {
        previousState: state,
        currentEventId: event.id,
        capability: event.capability,
        principal: event.principal
      });
      lastEventId = event.id;
    }

    return {
      state,
      eventsApplied: events.length,
      lastEventId,
      verification: ReplayVerifier.verifyEvents(events)
    };
  }

  replayTo(eventId: string): ReplayResult<S> {
    return this.replay({ toEventId: eventId });
  }

  private selectEvents(replayConfig: ReplayConfig): Event<E>[] {
    const allEvents = this.config.eventStore.readAll();
    let startIndex = replayConfig.fromIndex ?? 0;
    let endIndex = replayConfig.toIndex ?? allEvents.length - 1;

    if (replayConfig.fromEventId) {
      const index = allEvents.findIndex(event => event.id === replayConfig.fromEventId);
      startIndex = index === -1 ? startIndex : index;
    }

    if (replayConfig.toEventId) {
      const index = allEvents.findIndex(event => event.id === replayConfig.toEventId);
      endIndex = index === -1 ? endIndex : index;
    }

    return allEvents.slice(startIndex, endIndex + 1);
  }
}
