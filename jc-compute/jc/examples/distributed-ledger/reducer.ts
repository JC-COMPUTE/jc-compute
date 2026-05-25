import { Reducer } from '../../src';

export interface LedgerState {
  balances: Record<string, number>;
}

export interface LedgerPayload {
  account: string;
  amount: number;
}

export const ledgerReducer: Reducer<LedgerState, LedgerPayload> = (state, event) => {
  const { account, amount } = event.payload;
  const current = state.balances[account] ?? 0;

  switch (event.type) {
    case 'ledger.credit':
      return { balances: { ...state.balances, [account]: current + amount } };
    case 'ledger.debit':
      return { balances: { ...state.balances, [account]: current - amount } };
    default:
      return state;
  }
};
