const memoryStart = process.memoryUsage().heapUsed;

const store = [];

for (let i = 0; i < 500000; i++) {
  store.push({
    id: i,
    payload: 'runtime-event'
  });
}

const memoryEnd = process.memoryUsage().heapUsed;

console.log('Memory usage delta:', memoryEnd - memoryStart);
