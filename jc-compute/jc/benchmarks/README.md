# JC Compute Benchmark Suite

This benchmark suite validates deterministic execution, replay fidelity,
causal synchronization, distributed convergence, and runtime throughput.

## Benchmark Categories

### 1. Replay Throughput
Measures:
- events/sec replayed
- memory overhead
- snapshot recovery speed
- state reconstruction latency

### 2. Distributed Convergence
Measures:
- node synchronization time
- event propagation latency
- causal merge performance
- conflict resolution overhead

### 3. Deterministic Validation
Measures:
- hash consistency across nodes
- replay divergence detection
- deterministic checksum verification

### 4. Fault Recovery
Measures:
- replay after partition
- replay after corruption
- state recovery time
- rollback performance

## Target Metrics

| Metric | Target |
|---|---|
| Replay throughput | >1M events/minute |
| Deterministic mismatch rate | 0% |
| Convergence after partition | <5 seconds |
| Snapshot recovery | <500ms |
