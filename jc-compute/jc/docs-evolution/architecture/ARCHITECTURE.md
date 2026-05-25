# JC Compute Architecture

## Overview

JC Compute is built on a foundation of **causal ordering** and **deterministic execution**. This document describes the technical architecture and key design decisions.

---

## System Layers

### 1. Event Layer (Foundation)

The event layer is the immutable source of truth. All computation is derived from the event history.

**Responsibilities:**
- Store events permanently (append-only)
- Maintain causal references
- Track temporal ordering
- Provide cryptographic verification

**Key Types:**

```typescript
interface Event<T = any> {
  id: string;                          // Unique event identifier
  timestamp: number;                   // Logical or wall-clock time
  type: string;                        // Event type/action
  payload: T;                          // Event data
  
  // Causal metadata
  parentEventId?: string;              // Direct parent event
  parentEventIds?: string[];           // Multiple parents (fork merge)
  causality?: CausalRef[];             // Causal dependencies
  
  // Authority
  capability?: CapabilityContext;      // Required capability
  principal?: string;                  // Who triggered this
  
  // Verification
  hash?: string;                       // Event hash
  signature?: string;                  // Cryptographic signature
  
  // Execution context
  reducerTarget?: string;              // Which reducer processes this
  metadata?: Record<string, any>;      // Custom metadata
}

interface CausalRef {
  eventId: string;
  reason: string;                      // Why this event is a dependency
}
```

---

### 2. Reducer Layer (Transformation)

Reducers are pure, deterministic functions that transform state based on events.

**Requirements:**
- **Pure**: No side effects, no hidden state
- **Deterministic**: Same inputs always produce same outputs
- **Immutable**: Do not mutate input state
- **Stateless**: Operate only on provided inputs

**Reducer Pattern:**

```typescript
type Reducer<S, E> = (
  state: S,
  event: E,
  context?: ExecutionContext
) => S;
```

**Invariants:**
1. `Reducer(s, e) === Reducer(s, e)` — Idempotency
2. `Reducer(s, e1, e2) === Reducer(Reducer(s, e1), e2)` — Associativity
3. No I/O, no random, no date/time calls
4. No mutation of `state` or `event`

---

### 3. Execution Engine (Computation)

The execution engine applies events to state through reducers in causal order.

**Process:**

```
Event Emission
    ↓
Causal Validation
    ↓
Reducer Dispatch
    ↓
State Update
    ↓
Verification
    ↓
History Append
```

**Key Operations:**

```typescript
interface ExecutionEngine<S, E> {
  emit(event: E): void;                // Add event to history
  getState(): S;                       // Get current derived state
  getHistory(): Event<E>[];            // Get all events
  replay(until?: EventId): S;          // Replay to specific point
  verify(): boolean;                   // Verify execution integrity
}
```

---

### 4. Storage Layer (Persistence)

Immutable, append-only event storage with optional snapshotting.

**Event Store:**

```typescript
interface EventStore<E> {
  append(event: Event<E>): Promise<void>;
  read(id: string): Promise<Event<E> | null>;
  readAll(from?: number, to?: number): Promise<Event<E>[]>;
  readStream(): AsyncIterable<Event<E>>;
  count(): Promise<number>;
}
```

**Snapshot Store:**

```typescript
interface SnapshotStore<S> {
  save(snapshot: Snapshot<S>): Promise<void>;
  latest(): Promise<Snapshot<S> | null>;
  at(eventId: string): Promise<Snapshot<S> | null>;
}

interface Snapshot<S> {
  stateAtEventId: string;
  state: S;
  timestamp: number;
  hash: string;
}
```

---

### 5. Replay Engine (Reconstruction)

Rebuilds state from event history, enabling verification, debugging, and distributed recovery.

**Replay Process:**

```
Load Events
    ↓
Validate Causal Order
    ↓
Apply Reducers Sequentially
    ↓
Accumulate State
    ↓
Verify Against Known Hashes
    ↓
Return Final State
```

**Replay Operations:**

```typescript
interface ReplayEngine<S, E> {
  replay(reducer: Reducer<S, E>): S;
  replayTo(eventId: string): S;
  replayRange(from: string, to: string): S;
  verify(): ReplayVerification;
  debug(): ReplayDebugInfo;
}

interface ReplayVerification {
  valid: boolean;
  mismatchedAt?: string;
  expectedHash?: string;
  actualHash?: string;
  errors?: string[];
}
```

---

### 6. Causal Graph (Ordering)

Tracks causal dependencies between events to enable parallel execution and safe merging.

**Causal Graph Structure:**

```typescript
interface CausalGraph {
  addEdge(from: string, to: string): void;
  getParents(eventId: string): string[];
  getChildren(eventId: string): string[];
  isOrdered(a: string, b: string): boolean;
  topologicalSort(): string[];
  detectCycles(): boolean;
}
```

**Key Properties:**
- Events with no causal relationship can be reordered
- Events with causal link must maintain order
- Parallel branches can merge deterministically

---

### 7. Distributed Synchronization

Nodes stay synchronized by exchanging event history and replaying deterministically.

**Synchronization Model:**

```typescript
interface DistributedNode<S, E> {
  // Send our history to peer
  sync(peerId: string): Promise<SyncResult>;
  
  // Receive history from peer
  merge(events: Event<E>[]): Promise<MergeResult>;
  
  // Get state at point in time
  stateAt(eventId: string): S;
  
  // Verify consistency with peer
  verify(peerId: string): Promise<VerificationResult>;
}

interface SyncResult {
  eventsSent: number;
  eventsReceived: number;
  converged: boolean;
  finalState: any;
}
```

**Convergence Guarantee:**

Given:
- Same event history
- Deterministic reducers
- Correct causal ordering

Then:
- All nodes derive identical state
- Regardless of event arrival order
- Verified through replay

---

### 8. Capability System (Authority)

Explicit permission model where every effect requires declared capability.

**Capability Structure:**

```typescript
interface Capability {
  id: string;
  principal: string;                   // Who holds this capability
  scope: CapabilityScope;             // What it authorizes
  constraints?: CapabilityConstraint[];
  timestamp: number;
}

interface CapabilityScope {
  actions?: string[];                  // Which actions allowed
  resources?: string[];                // Which resources affected
  effect?: string;                     // Effect type
}

interface CapabilityConstraint {
  type: 'time' | 'count' | 'condition';
  value: any;
}
```

**Enforcement:**

```typescript
interface CapabilityChecker {
  canEmit(event: Event, capability?: Capability): boolean;
  canAccess(resource: string, capability: Capability): boolean;
  canEffect(effectType: string, capability: Capability): boolean;
}
```

---

### 9. Verification (Integrity)

Multiple layers of verification ensure correctness.

**Verification Types:**

```typescript
interface Verification {
  // Event-level verification
  verifyEventHash(event: Event): boolean;
  verifyEventSignature(event: Event, publicKey?: string): boolean;
  
  // History-level verification
  verifyCausalOrder(history: Event[]): boolean;
  verifyCausalChain(events: Event[]): boolean;
  
  // State-level verification
  verifyStateHash(state: any, hash: string): boolean;
  verifyReplayResult(history: Event[], state: any): boolean;
  
  // Distributed verification
  verifyNodeConvergence(nodes: Node[]): boolean;
}
```

---

## Data Flow

### Emission Flow

```
┌─────────────────────┐
│  Emit Event(e)      │
└──────────┬──────────┘
           │
    ┌──────▼──────┐
    │ Validate    │
    │ Causal Refs │
    └──────┬──────┘
           │
    ┌──────▼──────────┐
    │ Check           │
    │ Capability      │
    └──────┬──────────┘
           │
    ┌──────▼──────────┐
    │ Apply Reducer   │
    │ to Current      │
    │ State           │
    └──────┬──────────┘
           │
    ┌──────▼──────────┐
    │ Create New      │
    │ State Version   │
    └──────┬──────────┘
           │
    ┌──────▼──────────┐
    │ Compute Hash    │
    └──────┬──────────┘
           │
    ┌──────▼──────────┐
    │ Append Event    │
    │ to History      │
    └──────┬──────────┘
           │
    ┌──────▼──────────┐
    │ Broadcast to    │
    │ Subscribers &   │
    │ Peers           │
    └──────────────────┘
```

### Replay Flow

```
┌──────────────────────┐
│ Request Replay       │
└──────────┬───────────┘
           │
    ┌──────▼──────────┐
    │ Load Event      │
    │ History from    │
    │ Storage         │
    └──────┬──────────┘
           │
    ┌──────▼──────────┐
    │ Validate        │
    │ Causal Order    │
    └──────┬──────────┘
           │
    ┌──────▼──────────┐
    │ Initialize      │
    │ Initial State   │
    └──────┬──────────┘
           │
    ┌──────▼──────────┐
    │ For Each Event  │
    │ (in order):     │
    │ Apply Reducer   │
    └──────┬──────────┘
           │
    ┌──────▼──────────┐
    │ Verify Hash     │
    │ Checkpoints     │
    └──────┬──────────┘
           │
    ┌──────▼──────────┐
    │ Return Final    │
    │ State           │
    └──────────────────┘
```

### Synchronization Flow

```
┌─────────────┐         ┌─────────────┐
│  Node A     │         │  Node B     │
│             │         │             │
│ History: [] │         │ History: [] │
│ State: S0   │         │ State: S0   │
└──────┬──────┘         └──────┬──────┘
       │                       │
       │  Emit Event E1        │
       │──────────────────────▶│
       │  (A knows E1, B does) │
       │                       │
       │  Emit Event E2        │
       │◀──────────────────────│
       │  (B knows E2, A does) │
       │                       │
       │  SYNC: Exchange       │
       │  histories            │
       │◀─────────────────────▶│
       │                       │
       │  Both replay:         │
       │  [E1, E2]             │
       │                       │
       ├─ State: S_final  ─────┤
       ├─ State: S_final  ─────┤
       │      (identical)      │
```

---

## Performance Considerations

### Snapshots

To avoid replaying entire history:

```typescript
interface SnapshotStrategy {
  // Snapshot every N events
  frequency: number;
  
  // Keep N snapshots
  retention: number;
  
  // Compression level
  compression?: 'none' | 'gzip' | 'brotli';
}
```

### Indexing

Event store can maintain indices:
- By event type
- By principal
- By timestamp range
- By causal parent

### Batching

Distributed sync can batch events:
- Send/receive in chunks
- Reduce network overhead
- Maintain causal guarantees

---

## Security Model

### Event Signing

Optional cryptographic signatures:

```typescript
interface SignedEvent<E> extends Event<E> {
  publicKey?: string;
  signature: string;  // sign(JSON(event), privateKey)
}
```

### Capability Tokens

Encrypted capability bundles:

```typescript
interface CapabilityToken {
  encrypted: string;
  publicKey: string;
  challenge?: string;
}
```

### Access Control

Fine-grained permissions:

```typescript
canEmitEvent(principal, eventType, resources, capability)?
  → authorized || denied
```

---

## Error Handling

### Replication Conflicts

When nodes diverge:

```typescript
interface ReplicationConflict {
  conflictType: 'MissingEvents' | 'DivergentBranch';
  nodeA: EventId[];
  nodeB: EventId[];
  resolution: 'MergeByTime' | 'Custom';
}
```

### Corrupted History

Detection and recovery:

```typescript
if (!verify().valid) {
  // Find divergence point
  const corruption = findDivergencePoint(history);
  
  // Truncate to last good state
  // Or request re-sync
  // Or rebuild from peer
}
```

---

## Testing Strategy

### Unit Tests
- Reducer determinism
- Event creation
- State transitions

### Integration Tests
- Multi-step scenarios
- Distributed sync
- Replay verification

### Property Tests
- Causal ordering preserved
- Determinism across runs
- Convergence after sync

---

## Extensibility

### Custom Reducers

Implement application-specific logic:

```typescript
class UserReducer implements Reducer<UserState, UserEvent> {
  reduce(state: UserState, event: UserEvent): UserState {
    // Custom logic
  }
}
```

### Custom Storage

Implement different backends:

```typescript
class PostgresEventStore implements EventStore<Event> {
  async append(event: Event): Promise<void> {
    // Store in Postgres
  }
}
```

### Custom Verification

Add domain-specific verification:

```typescript
class BusinessRuleVerifier {
  verify(event: Event, state: State): boolean {
    // Enforce business rules
  }
}
```

---

## Summary

JC Compute unifies computation, storage, networking, and distribution through:

1. **Immutable event history** — Source of truth
2. **Deterministic reducers** — State transformation
3. **Causal ordering** — Dependency tracking
4. **Replay engine** — Reconstruction & verification
5. **Distributed sync** — Shared history convergence
6. **Capability system** — Explicit authority
7. **Verification** — Integrity assurance

All emerging from one coherent model: **causally ordered state transformation**.
