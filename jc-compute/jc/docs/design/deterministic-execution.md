# Deterministic Execution

Deterministic execution means the same initial state, event history, reducer
code, and event order produce the same final state on every node.

Reducers should avoid:

- Ambient time
- Random values
- Network calls
- File system calls
- Process environment reads
- Mutation of input objects

External effects should first become events. State is then derived from those
events by pure reducer logic.
