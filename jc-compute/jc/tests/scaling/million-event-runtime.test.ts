const events = [];

for (let i = 0; i < 1000000; i++) {
  events.push({
    id: i,
    type: 'EVENT'
  });
}

console.log('Million-event runtime initialized');
console.log('Events:', events.length);
