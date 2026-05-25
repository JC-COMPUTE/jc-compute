import { DistributedNode } from '../../src';
import { ledgerReducer, LedgerPayload, LedgerState } from './reducer';

export function createLedgerNode(nodeId: string): DistributedNode<LedgerState, LedgerPayload> {
  return new DistributedNode({
    nodeId,
    initialState: { balances: {} },
    reducer: ledgerReducer
  });
}
