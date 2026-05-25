import { EventFactory, EventStore } from '../../src';

describe('EventStore', () => {
  it('stores events append-only and prevents duplicates', () => {
    const store = new EventStore();
    const event = EventFactory.createEvent('thing.happened', { ok: true }, { id: 'e1' });

    store.append(event);

    expect(store.count()).toBe(1);
    expect(store.read('e1')?.hash).toBeDefined();
    expect(store.getHistory()).toEqual(['e1']);
    expect(() => store.append(event)).toThrow('already exists');
  });
});
