class DAGNode {
  constructor(
    public id: number,
    public parents: number[]
  ) {}
}

const graph: DAGNode[] = [];

for (let i = 0; i < 100000; i++) {
  graph.push(new DAGNode(i, [Math.max(0, i - 1)]));
}

const start = performance.now();

let traversed = 0;

for (const node of graph) {
  traversed += node.parents.length;
}

const end = performance.now();

console.log('Causal DAG traversal benchmark');
console.log('Nodes:', graph.length);
console.log('Traversal ops:', traversed);
console.log('Traversal time(ms):', end - start);
