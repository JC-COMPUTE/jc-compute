# Proof-Generated Test Cases

Future CI should generate adversarial test vectors directly from:

- TLA+ counterexamples
- Alloy model exploration
- Lean proof obligations
- Coq theorem witnesses

## Goal

Convert formal proof states into executable runtime tests.

This closes the loop between:

specification -> proof -> execution -> certification

---

## Required Classes

### Deterministic Replay Tests
- randomized ordering
- duplicate event injection
- delayed synchronization
- cross-runtime serialization

### Convergence Tests
- partition merge
- concurrent reductions
- conflicting ancestry

### Runtime Safety Tests
- malformed deltas
- lineage corruption
- causal cycles
- invalid ancestry injection
