import { EventFactory } from '../../src';
import { createLedgerNode } from './index';

describe('distributed ledger example', () => {
  it('converges after exchanging events', () => {
    const a = createLedgerNode('a');
    const b = createLedgerNode('b');
    const event = EventFactory.createEvent('ledger.credit', { account: 'alice', amount: 10 });

    a.emit(event);
    b.merge(a.engine.getHistory());

    expect(a.verifyWith(b).statesMatch).toBe(true);
    expect(b.engine.getState().balances.alice).toBe(10);
  });
});
