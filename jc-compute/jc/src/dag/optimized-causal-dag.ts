
export interface DAGNode {
  id: string;
  parents: string[];
  height: number;
}

export class OptimizedCausalDAG {
  private nodes = new Map<string, DAGNode>();
  private ancestryIndex = new Map<string, Set<string>>();

  addNode(node: DAGNode) {
    this.nodes.set(node.id, node);

    const ancestors = new Set<string>();

    for (const parent of node.parents) {
      ancestors.add(parent);

      const parentAncestors = this.ancestryIndex.get(parent);
      if (parentAncestors) {
        for (const ancestor of parentAncestors) {
          ancestors.add(ancestor);
        }
      }
    }

    this.ancestryIndex.set(node.id, ancestors);
  }

  isAncestor(ancestor: string, child: string): boolean {
    return this.ancestryIndex.get(child)?.has(ancestor) || false;
  }

  compressFrontier(frontier: string[]): string[] {
    return [...new Set(frontier)].slice(-1024);
  }

  pruneBelowHeight(height: number) {
    for (const [id, node] of this.nodes.entries()) {
      if (node.height < height) {
        this.nodes.delete(id);
        this.ancestryIndex.delete(id);
      }
    }
  }

  topologicalAcceleration(): DAGNode[] {
    return [...this.nodes.values()]
      .sort((a,b)=>a.height-b.height);
  }
}
