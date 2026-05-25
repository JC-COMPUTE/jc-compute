# Capability System

Capabilities attach authority to events instead of relying on hidden global
permissions.

1. Create grants for principals.
2. Add a capability context to emitted events.
3. Validate events with `CapabilityManager` or `AuthorityGuard`.

This keeps permission decisions auditable because authorization metadata becomes
part of history.
