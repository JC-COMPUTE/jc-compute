import { EventFactory, JCCompute, Reducer } from '../../src';

interface CounterState {
  count: number;
}

type CounterEvent =
  | { amount: number }
  | Record<string, never>;

export const counterReducer: Reducer<CounterState, CounterEvent> = (state, event) => {
  switch (event.type) {
    case 'counter.increment':
      return { count: state.count + Number(event.payload.amount ?? 1) };
    case 'counter.decrement':
      return { count: state.count - Number(event.payload.amount ?? 1) };
    case 'counter.reset':
      return { count: 0 };
    default:
      return state;
  }
};

export function createCounter(): JCCompute<CounterState, CounterEvent> {
  return new JCCompute({
    initialState: { count: 0 },
    reducer: counterReducer
  });
}

if (require.main === module) {
  const counter = createCounter();
  counter.emit(EventFactory.createEvent('counter.increment', { amount: 2 }));
  counter.emit(EventFactory.createEvent('counter.decrement', { amount: 1 }));
  console.log(counter.getState());
}
