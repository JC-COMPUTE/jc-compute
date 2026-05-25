import { CausalGraph, EventFactory, JCCompute, Reducer } from '../../src';

interface State {
  value: number;
}

const reducer: Reducer<State, { amount?: number }> = (state, event) => {
  if (event.type === 'add') {
    return { value: state.value + (event.payload.amount ?? 1) };
  }
  return state;
};

describe('JCCompute core', () => {
  it('emits events and replays to the same state', () => {
    const engine = new JCCompute({ initialState: { value: 0 }, reducer });

    const first = EventFactory.createEvent('add', { amount: 2 }, { id: 'e1' });
    const second = EventFactory.createChildEvent('e1', 'add', { amount: 3 }, { id: 'e2' });

    engine.emit(first);
    engine.emit(second);

    expect(engine.getState()).toEqual({ value: 5 });
    expect(engine.replay()).toEqual({ value: 5 });
    expect(engine.verify()).toBe(true);
    expect(engine.isOrdered('e1', 'e2')).toBe(true);
  });

  it('rejects missing causal parents', () => {
    const engine = new JCCompute({ initialState: { value: 0 }, reducer });
    const event = EventFactory.createChildEvent('missing', 'add', { amount: 1 });

    expect(() => engine.emit(event)).toThrow('Causal references');
  });

  it('detects graph cycles', () => {
    const graph = new CausalGraph();
    graph.addEdge('a', 'b');

    expect(() => graph.addEdge('b', 'a')).toThrow('cycle');
  });
});
