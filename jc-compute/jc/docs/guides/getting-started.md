# Getting Started

Install dependencies and run checks:

```sh
npm install
npm run build
npm test -- --runInBand
```

Create a compute engine:

```ts
import { EventFactory, JCCompute, Reducer } from 'jc-compute';

const reducer: Reducer<{ count: number }, { amount: number }> = (state, event) =>
  event.type === 'add' ? { count: state.count + event.payload.amount } : state;

const compute = new JCCompute({ initialState: { count: 0 }, reducer });
compute.emit(EventFactory.createEvent('add', { amount: 1 }));
```
