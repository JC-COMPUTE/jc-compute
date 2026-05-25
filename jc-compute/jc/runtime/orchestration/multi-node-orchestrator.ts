export interface RuntimeNode {
  id: string;
  peers: string[];
  stateVersion: number;
}

export class MultiNodeOrchestrator {
  private nodes: RuntimeNode[] = [];

  register(node: RuntimeNode) {
    this.nodes.push(node);
  }

  synchronize() {
    const highest = Math.max(...this.nodes.map(n => n.stateVersion));

    this.nodes = this.nodes.map(node => ({
      ...node,
      stateVersion: highest,
    }));

    return this.nodes;
  }
}
