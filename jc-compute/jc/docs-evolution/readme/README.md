# JC Compute

## Unified Causal Compute Stack (UCCS)

A deterministic causal computing system that unifies execution, storage, networking, synchronization, permissions, replay, and distributed state into one coherent computational model.

**Author:** James Chapman (xhecarpenxer@gmail.com)  
**License:** MIT  
**Version:** 1.0.0  
**Status:** Active Development

---

## 🎯 Core Vision

JC Compute treats computation as **deterministic state transformation over immutable causally ordered event history** under explicit authority constraints.

Instead of separating concerns (execution, storage, networking, synchronization, permissions, replay, distributed systems), JC Compute unifies them as different expressions of the same underlying process:

**causally ordered state transformation**

### The Philosophy

> The system remembers everything, follows rules step-by-step, and keeps many computers synchronized by sharing the same trusted history.

---

## ✨ Key Principles

1. **History Is Permanent** — Events are append-only and immutable
2. **Same Inputs = Same Outputs** — Deterministic execution guarantees convergence
3. **Everything Happens in Order** — Causal ordering ensures sequential consistency
4. **State Is Derived** — Current state is a projection of historical events
5. **Replay Must Always Work** — Any execution history must be replayable
6. **Authority Must Be Explicit** — All effects require declared capabilities
7. **Distributed Systems Share History** — Nodes synchronize through event exchange

---

## 📦 Repository Structure

```
JCCompute/
├── README.md                          # This file
├── LICENSE                            # MIT License
├── ARCHITECTURE.md                    # Detailed system architecture
├── WHITEPAPER.md                      # Technical whitepaper
├── CONTRIBUTING.md                    # Contribution guidelines
│
├── src/                               # Source code
│   ├── core/                          # Core engine
│   │   ├── event.ts                   # Event definition and handling
│   │   ├── reducer.ts                 # State reducer interface
│   │   ├── causal-graph.ts            # Causal ordering & dependencies
│   │   └── execution.ts               # Deterministic execution engine
│   │
│   ├── storage/                       # Storage layer
│   │   ├── event-store.ts             # Immutable event persistence
│   │   ├── snapshot.ts                # State snapshots
│   │   └── index.ts                   # Storage exports
│   │
│   ├── replay/                        # Replay engine
│   │   ├── replay-engine.ts           # Core replay logic
│   │   ├── verification.ts            # Verification & validation
│   │   └── index.ts                   # Replay exports
│   │
│   ├── distributed/                   # Distributed systems
│   │   ├── synchronization.ts         # Node synchronization
│   │   ├── merge-semantics.ts         # Conflict resolution
│   │   ├── consensus.ts               # Consensus mechanisms
│   │   └── index.ts                   # Distributed exports
│   │
│   ├── capability/                    # Capability system
│   │   ├── capability.ts              # Capability definitions
│   │   ├── authority.ts               # Authority & permissions
│   │   └── index.ts                   # Capability exports
│   │
│   ├── types/                         # TypeScript type definitions
│   │   ├── index.ts                   # Core types
│   │   ├── event.ts                   # Event types
│   │   └── reducer.ts                 # Reducer types
│   │
│   └── index.ts                       # Main exports
│
├── tests/                             # Test suite
│   ├── unit/                          # Unit tests
│   │   ├── core.test.ts
│   │   ├── reducer.test.ts
│   │   ├── event-store.test.ts
│   │   └── replay.test.ts
│   │
│   ├── integration/                   # Integration tests
│   │   ├── distributed.test.ts
│   │   ├── synchronization.test.ts
│   │   └── consensus.test.ts
│   │
│   └── fixtures/                      # Test data
│       └── events.json
│
├── examples/                          # Example implementations
│   ├── counter/                       # Simple counter example
│   │   ├── index.ts
│   │   └── test.ts
│   │
│   ├── todo-app/                      # Todo list example
│   │   ├── index.ts
│   │   ├── reducer.ts
│   │   └── test.ts
│   │
│   └── distributed-ledger/            # Distributed ledger example
│       ├── index.ts
│       ├── reducer.ts
│       └── test.ts
│
├── docs/                              # Documentation
│   ├── guides/                        # User guides
│   │   ├── getting-started.md
│   │   ├── core-concepts.md
│   │   ├── writing-reducers.md
│   │   ├── capability-system.md
│   │   └── distributed-sync.md
│   │
│   ├── api/                           # API reference
│   │   ├── event-api.md
│   │   ├── reducer-api.md
│   │   ├── replay-api.md
│   │   └── capability-api.md
│   │
│   └── design/                        # Design documents
│       ├── causal-ordering.md
│       ├── deterministic-execution.md
│       └── distributed-convergence.md
│
├── .github/
│   ├── workflows/
│   │   ├── test.yml                   # CI/CD tests
│   │   ├── build.yml                  # Build workflow
│   │   └── release.yml                # Release workflow
│   │
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       └── feature_request.md
│
├── package.json                       # NPM configuration
├── tsconfig.json                      # TypeScript configuration
├── jest.config.js                     # Test configuration
├── .eslintrc.json                     # Linting configuration
├── .gitignore                         # Git ignore rules
└── scripts/                           # Utility scripts
    ├── build.sh
    ├── test.sh
    └── dev.sh
```

---

## 🚀 Quick Start

### Installation

```bash
npm install jc-compute
```

### Basic Usage

```typescript
import { JCCompute, Reducer, Event } from 'jc-compute';

// Define your state type
interface CounterState {
  value: number;
}

// Define your reducer
const counterReducer: Reducer<CounterState> = (state, event) => {
  switch (event.type) {
    case 'INCREMENT':
      return { value: state.value + 1 };
    case 'DECREMENT':
      return { value: state.value - 1 };
    default:
      return state;
  }
};

// Create a compute instance
const compute = new JCCompute({
  reducer: counterReducer,
  initialState: { value: 0 }
});

// Emit events
compute.emit({ type: 'INCREMENT' });
compute.emit({ type: 'INCREMENT' });

// Get current state
console.log(compute.getState()); // { value: 2 }

// Replay from history
const replayed = compute.replay();
console.log(replayed); // { value: 2 }
```

---

## 🏗️ Architecture Overview

### Unified Causal Architecture

```
          Events
             ↓
      Causal Ordering
             ↓
    Deterministic Execution
             ↓
       State Projection
             ↓
   Distributed Synchronization
             ↓
     Shared Global History
             ↓
      Replay + Verification
             ↓
      Semantic Computation
```

### Core System Equation

```
State[t+1] = Reducer(State[t], Event[t], Capabilities[t])
```

---

## 🔑 Core Components

### Event Layer
Stores everything that happens. Each event contains:
- Event ID
- Timestamp or logical clock
- Parent causal references
- Action payload
- Capability/authority context
- Reducer target
- Cryptographic verification metadata

### Reducers
Deterministic state transition functions. Pure functions that:
- Cannot mutate hidden state
- Cannot produce random outcomes
- Produce identical results everywhere

### Causal Execution
Execution modeled as directed causal graph. Events form dependency chains that capture what caused what.

### Replay Engine
Reconstructs state by sequential deterministic execution over event history. Enables verification, synchronization, debugging, auditing, migration, and recovery.

### Synchronization Model
Nodes synchronize by exchanging event history and causal metadata. Convergence through deterministic replay, causal ordering, immutable history, and merge-safe structures.

### Capability System
Execution authority is capability-scoped. Capabilities define what actions are permitted, what state regions may change, and which effects may execute.

---

## 📚 Documentation

- **[Architecture Guide](./ARCHITECTURE.md)** — Detailed system design
- **[Getting Started](./docs/guides/getting-started.md)** — Step-by-step tutorial
- **[Core Concepts](./docs/guides/core-concepts.md)** — Understand the fundamentals
- **[Writing Reducers](./docs/guides/writing-reducers.md)** — Create deterministic transformations
- **[API Reference](./docs/api/)** — Complete API documentation
- **[Design Documents](./docs/design/)** — Technical deep dives

---

## 💡 Examples

### 1. Simple Counter
```typescript
// See examples/counter/ for full implementation
```

### 2. Todo Application
```typescript
// See examples/todo-app/ for full implementation
```

### 3. Distributed Ledger
```typescript
// See examples/distributed-ledger/ for full implementation
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test -- counter.test.ts
```

---

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Watch mode
npm run dev

# Lint code
npm run lint

# Format code
npm run format
```

---

## 📋 Fundamental Invariants

1. **History Cannot Be Changed** — The past is immutable; new state emerges from additional events
2. **Same History = Same State** — Deterministic replay guarantees convergence
3. **Every Effect Has A Cause** — No hidden mutation; all change is causally linked
4. **Authority Is Explicit** — All mutation requires declared capability
5. **Distributed State Is Derived** — Synchronization emerges from shared history

---

## 🔬 Why This Matters

Modern systems are fragmented:
- Databases track storage
- Networks move packets
- Runtimes execute logic
- Synchronization is bolted on
- Replay is optional
- Permissions are external
- Distributed systems are specialized

**JC Compute unifies these into one coherent model:**

```
history → causality → deterministic transformation → synchronized state
```

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Code style guidelines
- Commit message conventions
- Pull request process
- Issue reporting

---

## 📝 License

This project is licensed under the MIT License — see [LICENSE](./LICENSE) file for details.
Copyright, project identity, whitepaper materials, logos, and original JC Compute
branding remain with James Chapman; see [NOTICE.md](./NOTICE.md).

---

## 👤 Author

**James Chapman**  
Email: xhecarpenxer@gmail.com  
GitHub: XheCarpenXer

---

## 🗺️ Roadmap

### Phase 1: Core Implementation (Current)
- [ ] Event layer and storage
- [ ] Basic reducer execution
- [ ] Simple replay engine
- [ ] Unit tests

### Phase 2: Advanced Features
- [ ] Capability system
- [ ] Distributed synchronization
- [ ] Consensus mechanisms
- [ ] Advanced verification

### Phase 3: Optimization
- [ ] Performance optimization
- [ ] Snapshot strategies
- [ ] Advanced caching
- [ ] Network efficiency

### Phase 4: Ecosystem
- [ ] Official examples
- [ ] Community tools
- [ ] Integration libraries
- [ ] Language bindings

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/xhecarpenxer/jc-compute/issues)
- **Discussions**: [GitHub Discussions](https://github.com/xhecarpenxer/jc-compute/discussions)
- **Email**: xhecarpenxer@gmail.com

---

## 🙏 Acknowledgments

This project represents a unified vision of computation built on principles of causal ordering, determinism, and immutable history. Inspired by event sourcing, functional programming, distributed systems theory, and cryptographic verification.

---

**JC Compute: The system remembers everything, follows rules step-by-step, and keeps many computers synchronized by sharing the same trusted history.**
