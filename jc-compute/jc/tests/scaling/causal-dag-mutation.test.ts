class Node {
  constructor(
    public id: number,
    public parents: number[]
  ) {}
}

const dag = [];

for (let i = 0; i < 100000; i++) {
  dag.push(new Node(i, [i - 1]));
}

console.log('Large DAG mutation test complete');
console.log('Nodes mutated:', dag.length);
