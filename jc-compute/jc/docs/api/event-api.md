# Event API

Events are immutable records of action. They are appended to `EventStore` and
then replayed through reducers to derive state.

## EventFactory

```ts
EventFactory.createEvent('counter.increment', { amount: 1 });
EventFactory.createChildEvent(parentId, 'counter.increment', { amount: 1 });
EventFactory.createMergeEvent([leftId, rightId], 'merge', {});
```

## EventStore

- `append(event)` stores a frozen event and computes a hash when missing.
- `read(id)` returns one event or `null`.
- `readAll()` returns history in append order.
- `readRange(from, to)` returns an inclusive index range.
- `count()` returns total events.
