# Distributed Sync

Use `SyncManager` when you want nodes to exchange event history without choosing
a real network transport yet.

```ts
const message = leftSync.createSyncMessage('right');
rightSync.processSyncMessage(message);
```

Production transports should serialize `SyncMessage` objects and preserve the
event order supplied by the sending node.
