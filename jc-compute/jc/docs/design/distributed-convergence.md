# Distributed Convergence

Nodes converge by exchanging immutable event history and replaying it with the
same reducer.

The minimal flow is:

1. Node A emits events.
2. Node A creates a sync message.
3. Node B appends unseen events.
4. Node B replays history.
5. Both nodes compare derived state or replay verification.

This package ships `SyncManager`, `InMemoryTransport`, `MergeSemantics`, and
`DistributedNode` as a compact reference implementation.
