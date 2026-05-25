import { EventFactory, EventStore, ReplayEngine, Reducer } from '../../src';

describe('ReplayEngine', () => {
  it('rebuilds state from stored events', () => {
    const store = new EventStore<{ amount: number }>();
    const reducer: Reducer<number, { amount: number }> = (state, event) =>
      event.type === 'add' ? state + event.payload.amount : state;

    store.append(EventFactory.createEvent('add', { amount: 2 }, { id: 'e1' }));
    store.append(EventFactory.createChildEvent('e1', 'add', { amount: 4 }, { id: 'e2' }));

    const replay = new ReplayEngine({ initialState: 0, reducer, eventStore: store });
    const result = replay.replay();

    expect(result.state).toBe(6);
    expect(result.eventsApplied).toBe(2);
    expect(result.verification.valid).toBe(true);
  });
});
