import { EventFactory, EventStore, InMemoryTransport, SyncManager } from '../../src';

describe('synchronization', () => {
  it('broadcasts event history between registered nodes', async () => {
    const leftStore = new EventStore();
    const rightStore = new EventStore();
    const left = new SyncManager({ nodeId: 'left', eventStore: leftStore });
    const right = new SyncManager({ nodeId: 'right', eventStore: rightStore });
    const transport = new InMemoryTransport();

    leftStore.append(EventFactory.createEvent('sync.test', { value: 1 }, { id: 'e1' }));
    transport.registerNode('left', left);
    transport.registerNode('right', right);

    await transport.broadcast(left.createSyncMessage('right'));

    expect(rightStore.count()).toBe(1);
    expect(rightStore.read('e1')?.payload).toEqual({ value: 1 });
  });
});
