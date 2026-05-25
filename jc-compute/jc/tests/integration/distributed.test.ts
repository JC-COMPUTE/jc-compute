import { DistributedNode, EventFactory, Reducer } from '../../src';

interface State {
  total: number;
}

const reducer: Reducer<State, { amount: number }> = (state, event) =>
  event.type === 'add' ? { total: state.total + event.payload.amount } : state;

describe('distributed nodes', () => {
  it('converges when peers merge the same history', () => {
    const a = new DistributedNode({ nodeId: 'a', initialState: { total: 0 }, reducer });
    const b = new DistributedNode({ nodeId: 'b', initialState: { total: 0 }, reducer });

    a.emit(EventFactory.createEvent('add', { amount: 5 }, { id: 'e1' }));
    b.merge(a.engine.getHistory());

    expect(a.verifyWith(b)).toMatchObject({
      verified: true,
      statesMatch: true
    });
  });
});
