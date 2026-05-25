# Capability API

Capabilities make authority explicit in event history.

```ts
const manager = new CapabilityManager();
manager.createGrant({
  grantId: 'g1',
  grantedBy: 'root',
  grantedTo: 'alice',
  capabilities: [StandardCapabilities.EMIT_EVENT]
});
```

Use `CapabilityBuilder` to construct event capability contexts and
`AuthorityGuard` to reject unauthorized events before emission.
