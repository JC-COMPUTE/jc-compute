import { EventFactory, ReducerValidator, combineReducers } from '../../src';

describe('reducer utilities', () => {
  it('combines reducers by event type', () => {
    const reducer = combineReducers<{ count: number }>({
      inc: state => ({ count: state.count + 1 })
    });

    const state = reducer({ count: 0 }, EventFactory.createEvent('inc', {}));

    expect(state).toEqual({ count: 1 });
  });

  it('validates deterministic reducers', () => {
    const result = ReducerValidator.validateDeterminism(
      state => ({ count: state.count + 1 }),
      { count: 0 },
      EventFactory.createEvent('inc', {})
    );

    expect(result.valid).toBe(true);
  });
});
