# Causal Ordering

JC Compute models history as a directed acyclic graph. An event can point to one
parent, many parents, or explicit causal references.

The graph gives the runtime three guarantees:

- Parent events are known before children are accepted.
- Cycles are rejected.
- Replay can preserve cause-before-effect ordering.

Independent events may be merged by deterministic tie-breakers, such as
timestamp followed by event id.
