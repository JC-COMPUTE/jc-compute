# Writing Reducers

Reducers should be boring in the best possible way: pure, predictable, and easy
to replay.

```ts
const reducer = (state, event) => {
  switch (event.type) {
    case 'todo.add':
      return { todos: [...state.todos, event.payload] };
    default:
      return state;
  }
};
```

Prefer exhaustive event names and small payloads. Keep validation either before
emission or inside reducer branches that can reject invalid events
deterministically.
