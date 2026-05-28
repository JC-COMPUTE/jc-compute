"""
verify_concurrency_ordering.py
──────────────────────────────
Verifies that the JC Compute causal event ordering is deterministic under
concurrent execution.

Tests:
  1. Topological ordering invariant: for any valid history, every parent
     event appears before its child in the topological sort.
  2. Canonical ordering stability: repeated sorts of the same DAG yield
     the same result (idempotent).
  3. Concurrent emission simulation: events emitted from multiple
     "threads" (simulated) are re-ordered deterministically by causal
     ancestry, not by wall-clock arrival time.
  4. Cycle detection: graphs with cycles are rejected.
"""

from __future__ import annotations
import random
import time
from collections import deque, defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set


# ── Domain model ──────────────────────────────────────────────────────────────

@dataclass
class Event:
    id: str
    delta: int
    parents: List[str] = field(default_factory=list)


# ── Topological sort (Kahn's algorithm) ──────────────────────────────────────

def topological_sort(events: List[Event]) -> List[Event]:
    """
    Returns a topologically sorted list of events (parents before children).
    Raises ValueError if cycles are detected.
    Tie-breaking is deterministic: among zero-in-degree nodes, sort by id.
    """
    index: Dict[str, Event] = {e.id: e for e in events}
    in_degree: Dict[str, int] = {e.id: 0 for e in events}
    children: Dict[str, List[str]] = defaultdict(list)

    for event in events:
        for parent_id in event.parents:
            if parent_id not in index:
                raise ValueError(f"Event {event.id} references unknown parent {parent_id}")
            in_degree[event.id] += 1
            children[parent_id].append(event.id)

    # Use a sorted queue for deterministic tie-breaking (not arrival-order)
    queue: deque[str] = deque(
        sorted(eid for eid, deg in in_degree.items() if deg == 0)
    )
    result: List[Event] = []

    while queue:
        current_id = queue.popleft()
        result.append(index[current_id])

        ready = []
        for child_id in children[current_id]:
            in_degree[child_id] -= 1
            if in_degree[child_id] == 0:
                ready.append(child_id)
        queue.extend(sorted(ready))   # deterministic ordering

    if len(result) != len(events):
        raise ValueError("Cycle detected in causal event graph")

    return result


# ── Test 1: Topological ordering invariant ────────────────────────────────────

def test_topological_invariant() -> None:
    events = [
        Event("e1", 1),
        Event("e2", 2, parents=["e1"]),
        Event("e3", 3, parents=["e1"]),
        Event("e4", 4, parents=["e2", "e3"]),
        Event("e5", 5, parents=["e4"]),
    ]

    ordered = topological_sort(events)
    id_to_pos = {e.id: i for i, e in enumerate(ordered)}

    for event in events:
        for parent_id in event.parents:
            assert id_to_pos[parent_id] < id_to_pos[event.id], (
                f"Parent {parent_id} appears after child {event.id} in sort order"
            )

    print("✓ Test 1 PASS: topological ordering invariant holds")


# ── Test 2: Canonical ordering stability (idempotence) ────────────────────────

def test_canonical_stability() -> None:
    rng = random.Random(42)
    events = [Event(f"e{i}", i, parents=[f"e{i-1}"] if i > 0 else []) for i in range(20)]

    results: List[List[str]] = []
    for _ in range(10):
        shuffled = events[:]
        rng.shuffle(shuffled)
        ordered = topological_sort(shuffled)
        results.append([e.id for e in ordered])

    canonical = results[0]
    for r in results[1:]:
        assert r == canonical, f"Sort is not stable: {canonical} vs {r}"

    print("✓ Test 2 PASS: canonical ordering is stable across 10 shuffled inputs")


# ── Test 3: Concurrent emission simulation ────────────────────────────────────

def simulate_concurrent_emission(num_threads: int, events_per_thread: int) -> List[Event]:
    """
    Simulate N threads each emitting M events with random inter-thread
    causal dependencies.  Events arrive at the collector in random order.
    """
    rng = random.Random(0)
    all_events: Dict[str, Event] = {}
    arrival_order: List[Event] = []

    # Each thread emits a chain
    thread_tips: List[Optional[str]] = [None] * num_threads

    for t in range(num_threads):
        for i in range(events_per_thread):
            eid = f"t{t}_e{i}"
            parents: List[str] = []
            if thread_tips[t]:
                parents.append(thread_tips[t])  # type: ignore[arg-type]
            # Occasionally add a cross-thread dependency
            if i > 0 and rng.random() < 0.3:
                other = rng.randint(0, num_threads - 1)
                if other != t and thread_tips[other]:
                    parents.append(thread_tips[other])  # type: ignore[arg-type]
            event = Event(eid, rng.randint(1, 10), parents=parents)
            all_events[eid] = event
            thread_tips[t] = eid
            arrival_order.append(event)

    # Shuffle arrival order to simulate network reordering
    rng.shuffle(arrival_order)
    return arrival_order


def test_concurrent_emission() -> None:
    events = simulate_concurrent_emission(num_threads=5, events_per_thread=10)
    ordered = topological_sort(events)

    id_to_pos = {e.id: i for i, e in enumerate(ordered)}
    for event in ordered:
        for parent_id in event.parents:
            assert id_to_pos[parent_id] < id_to_pos[event.id], (
                f"Parent {parent_id} not before child {event.id} after concurrent sort"
            )

    # Verify replay state is the same as sequential sum (order-independent reducer)
    state_from_ordered = sum(e.delta for e in ordered)
    state_from_arrival = sum(e.delta for e in events)
    assert state_from_ordered == state_from_arrival, (
        f"State mismatch: ordered={state_from_ordered} arrival={state_from_arrival}"
    )

    print(f"✓ Test 3 PASS: concurrent emission (5 threads × 10 events) sorted correctly "
          f"(state={state_from_ordered})")


# ── Test 4: Cycle detection ───────────────────────────────────────────────────

def test_cycle_detection() -> None:
    # e1 → e2 → e3 → e1 (cycle)
    events = [
        Event("e1", 1, parents=["e3"]),
        Event("e2", 2, parents=["e1"]),
        Event("e3", 3, parents=["e2"]),
    ]
    try:
        topological_sort(events)
        assert False, "Should have raised ValueError for cycle"
    except ValueError as exc:
        assert "Cycle" in str(exc) or "unknown parent" in str(exc)
    print("✓ Test 4 PASS: cycle correctly detected and rejected")


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    test_topological_invariant()
    test_canonical_stability()
    test_concurrent_emission()
    test_cycle_detection()
    print("\nAll concurrency ordering verification tests passed.")
