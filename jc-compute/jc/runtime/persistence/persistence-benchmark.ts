import fs from 'fs';

const events = [];

for (let i = 0; i < 500000; i++) {
  events.push({
    id: i,
    ts: Date.now(),
    type: 'UPDATE'
  });
}

const start = performance.now();

fs.writeFileSync(
  './benchmark-events.json',
  JSON.stringify(events)
);

const end = performance.now();

console.log('Persistence benchmark completed');
console.log('Duration(ms):', end - start);
