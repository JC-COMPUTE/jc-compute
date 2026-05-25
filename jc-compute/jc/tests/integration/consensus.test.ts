import { DistributedNode, EventFactory, Reducer } from '../../src';

type State = Record<string, number>;

const reducer: Reducer<State, { key: string; value: number }> = (state, event) => {
  if (event.type !== 'set') return state;
  return { ...state, [event.payload.key]: event.payload.value };
};

describe('consensus', () => {
  it('reports divergent node state', () => {
    const a = new DistributedNode({ nodeId: 'a', initialState: {}, reducer });
    const b = new DistributedNode({ nodeId: 'b', initialState: {}, reducer });

    a.emit(EventFactory.createEvent('set', { key: 'x', value: 1 }, { id: 'e1' }));
    b.emit(EventFactory.createEvent('set', { key: 'x', value: 2 }, { id: 'e2' }));

    expect(a.verifyWith(b).statesMatch).toBe(false);
  });
});
