import { performance } from 'perf_hooks';

interface Event {
  id: number;
  type: string;
  timestamp: number;
}

const events: Event[] = [];

for (let i = 0; i < 100000; i++) {
  events.push({
    id: i,
    type: 'STATE_UPDATE',
    timestamp: Date.now(),
  });
}

const start = performance.now();

let state = 0;

for (const event of events) {
  state += event.id;
}

const end = performance.now();

console.log('Replay Benchmark');
console.log('Events:', events.length);
console.log('Final State:', state);
console.log('Duration:', `${(end - start).toFixed(2)}ms`);
console.log('Events/sec:', Math.floor(events.length / ((end - start) / 1000)));
