"""
verify_replay_convergence.py
────────────────────────────
Verifies the core JC Compute convergence properties:

  1. Replay determinism: same ordered history always yields same state.
  2. Partition then merge convergence: two nodes that diverge during a
     network partition converge to the same state after reconciliation.
  3. Idempotent delivery: receiving a duplicate event is a no-op.
  4. Order independence (commutative reducer): for reducers where order
     does not matter, any permutation of the history yields the same state.
  5. Hash-chain integrity: tampering with any event is detectable.
"""

from __future__ import annotations
import hashlib
import json
import random
from copy import deepcopy
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple


# ── Domain model ──────────────────────────────────────────────────────────────

@dataclass
class Event:
    id: str
    delta: int
    parents: List[str] = field(default_factory=list)
    hash: Optional[str] = field(default=None, repr=False)

    def compute_hash(self) -> str:
        payload = json.dumps(
            {"id": self.id, "delta": self.delta, "parents": sorted(self.parents)},
            sort_keys=True,
        )
        return hashlib.sha256(payload.encode()).hexdigest()


def chain_hash(events: List[Event]) -> str:
    """Running hash over the full ordered event list."""
    h = hashlib.sha256()
    for e in events:
        h.update(e.compute_hash().encode())
    return h.hexdigest()


# ── Replay ────────────────────────────────────────────────────────────────────

def replay(history: List[Event], initial_state: int = 0) -> int:
    state = initial_state
    for e in history:
        state += e.delta
    return state


# ── Node (simulates a distributed replica) ────────────────────────────────────

class Node:
    def __init__(self, node_id: str) -> None:
        self.node_id = node_id
        self.log: List[Event] = []
        self._seen: Set[str] = set()

    def emit(self, event: Event) -> None:
        if event.id in self._seen:
            return  # idempotent
        event.hash = event.compute_hash()
        self.log.append(event)
        self._seen.add(event.id)

    def merge(self, remote_log: List[Event]) -> int:
        """Merge events from a remote log; returns count of new events applied."""
        applied = 0
        for event in remote_log:
            if event.id not in self._seen:
                self.emit(event)
                applied += 1
        return applied

    def state(self) -> int:
        return replay(self.log)


# ── Test 1: Replay determinism ────────────────────────────────────────────────

def test_replay_determinism() -> None:
    events = [Event(f"e{i}", i + 1) for i in range(20)]
    s1 = replay(events)
    s2 = replay(events)
    assert s1 == s2, f"Replay is not deterministic: {s1} != {s2}"
    print(f"✓ Test 1 PASS: replay determinism (state={s1})")


# ── Test 2: Partition → merge convergence ────────────────────────────────────

def test_partition_convergence() -> None:
    rng = random.Random(7)

    # Initial shared history
    shared = [Event(f"shared_{i}", i + 1) for i in range(5)]

    node_a = Node("A")
    node_b = Node("B")
    for e in shared:
        node_a.emit(deepcopy(e))
        node_b.emit(deepcopy(e))

    # Partition: each node emits independently
    for i in range(5):
        node_a.emit(Event(f"a_{i}", rng.randint(1, 5)))
        node_b.emit(Event(f"b_{i}", rng.randint(1, 5)))

    assert node_a.state() != node_b.state(), "States should differ during partition"

    # Merge: A ← B and B ← A
    node_a.merge(node_b.log)
    node_b.merge(node_a.log)

    assert node_a.state() == node_b.state(), (
        f"Convergence failure after merge: A={node_a.state()} B={node_b.state()}"
    )
    print(f"✓ Test 2 PASS: partition-then-merge convergence (state={node_a.state()})")


# ── Test 3: Idempotent delivery ───────────────────────────────────────────────

def test_idempotent_delivery() -> None:
    node = Node("idempotent")
    events = [Event(f"e{i}", i + 1) for i in range(10)]
    for e in events:
        node.emit(deepcopy(e))

    state_before = node.state()
    count_before = len(node.log)

    # Re-deliver all events
    for e in events:
        node.emit(deepcopy(e))

    assert node.state() == state_before, "State changed after duplicate delivery"
    assert len(node.log) == count_before, "Log grew after duplicate delivery"
    print(f"✓ Test 3 PASS: idempotent delivery (state={state_before}, log_len={count_before})")


# ── Test 4: Commutative reducer under permutation ────────────────────────────

def test_order_independence() -> None:
    rng = random.Random(3)
    events = [Event(f"e{i}", rng.randint(1, 100)) for i in range(15)]
    canonical_state = replay(events)

    for trial in range(20):
        perm = events[:]
        rng.shuffle(perm)
        s = replay(perm)
        assert s == canonical_state, (
            f"Order-independence failed on trial {trial}: expected {canonical_state} got {s}"
        )

    print(f"✓ Test 4 PASS: commutative reducer is order-independent across 20 permutations "
          f"(state={canonical_state})")


# ── Test 5: Hash-chain integrity (tamper detection) ──────────────────────────

def test_hash_chain_integrity() -> None:
    events = [Event(f"e{i}", i + 1) for i in range(10)]
    for e in events:
        e.hash = e.compute_hash()

    original_chain = chain_hash(events)

    # Tamper with middle event
    tampered = deepcopy(events)
    tampered[5].delta += 99  # mutate payload

    tampered_chain = chain_hash(tampered)
    assert original_chain != tampered_chain, "Tamper not detected by hash chain"

    # Verify individual hash also changes
    assert tampered[5].compute_hash() != events[5].hash, "Individual hash not invalidated"

    print("✓ Test 5 PASS: hash-chain detects payload tampering")


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    test_replay_determinism()
    test_partition_convergence()
    test_idempotent_delivery()
    test_order_independence()
    test_hash_chain_integrity()
    print("\nAll replay convergence verification tests passed.")
