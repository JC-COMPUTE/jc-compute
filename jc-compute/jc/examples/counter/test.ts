import { EventFactory } from '../../src';
import { createCounter } from './index';

describe('counter example', () => {
  it('applies deterministic counter events', () => {
    const counter = createCounter();

    counter.emit(EventFactory.createEvent('counter.increment', { amount: 3 }));
    counter.emit(EventFactory.createEvent('counter.decrement', { amount: 1 }));

    expect(counter.getState()).toEqual({ count: 2 });
    expect(counter.verify()).toBe(true);
  });
});
