# Replay API

`ReplayEngine` rebuilds state from an `EventStore`.

```ts
const replay = new ReplayEngine({ initialState, reducer, eventStore });
const result = replay.replay();
```

`result` contains:

- `state`
- `eventsApplied`
- `lastEventId`
- `verification`

Replay can be bounded with `fromEventId`, `toEventId`, `fromIndex`, or
`toIndex`.
