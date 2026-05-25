# Reducer API

Reducers are deterministic state transition functions:

```ts
type Reducer<S, E> = (state: S, event: Event<E>, context?: ExecutionContext<S>) => S;
```

Rules:

- Return a new state value.
- Do not mutate `state` or `event`.
- Do not call random, time, network, file system, or process APIs.
- Unknown event types should return the current state unchanged.

Use `combineReducers` to dispatch by event type, and `ReducerValidator` for a
basic deterministic smoke test.
