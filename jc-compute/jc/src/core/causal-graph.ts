/**
 * Causal Graph - Track dependencies and ensure ordering
 */

/**
 * CausalGraph - Directed acyclic graph of event dependencies
 */
export class CausalGraph {
  private edges: Map<string, Set<string>> = new Map();
  private reverseEdges: Map<string, Set<string>> = new Map();

  /**
   * Add a directed edge from parent to child
   */
  addEdge(from: string, to: string): void {
    if (this.wouldCreateCycle(from, to)) {
      throw new Error(`Adding edge ${from} -> ${to} would create a cycle`);
    }

    if (!this.edges.has(from)) {
      this.edges.set(from, new Set());
    }
    this.edges.get(from)!.add(to);

    if (!this.reverseEdges.has(to)) {
      this.reverseEdges.set(to, new Set());
    }
    this.reverseEdges.get(to)!.add(from);
  }

  /**
   * Get all parents of an event
   */
  getParents(eventId: string): string[] {
    const parents = this.reverseEdges.get(eventId);
    return parents ? Array.from(parents) : [];
  }

  /**
   * Get all children of an event
   */
  getChildren(eventId: string): string[] {
    const children = this.edges.get(eventId);
    return children ? Array.from(children) : [];
  }

  /**
   * Check if there's a causal path from A to B
   */
  isAncestorOf(ancestor: string, descendant: string): boolean {
    if (ancestor === descendant) return false;

    const visited = new Set<string>();
    const queue = [ancestor];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === descendant) return true;

      if (visited.has(current)) continue;
      visited.add(current);

      const children = this.getChildren(current);
      queue.push(...children);
    }

    return false;
  }

  /**
   * Check if two events are causally ordered
   * Returns true if there's a causal path from a to b
   */
  isOrdered(a: string, b: string): boolean {
    return this.isAncestorOf(a, b);
  }

  /**
   * Get topological sort of all events
   */
  topologicalSort(): string[] {
    const allNodes = new Set<string>();

    // Collect all nodes
    for (const [from, toSet] of this.edges) {
      allNodes.add(from);
      for (const to of toSet) {
        allNodes.add(to);
      }
    }

    for (const [to, fromSet] of this.reverseEdges) {
      allNodes.add(to);
      for (const from of fromSet) {
        allNodes.add(from);
      }
    }

    // Kahn's algorithm
    const inDegree = new Map<string, number>();
    for (const node of allNodes) {
      inDegree.set(node, this.getParents(node).length);
    }

    const queue = Array.from(allNodes).filter(node => inDegree.get(node) === 0);
    const result: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const children = this.getChildren(current);
      for (const child of children) {
        const newInDegree = inDegree.get(child)! - 1;
        inDegree.set(child, newInDegree);

        if (newInDegree === 0) {
          queue.push(child);
        }
      }
    }

    // If result doesn't include all nodes, there's a cycle
    if (result.length !== allNodes.size) {
      throw new Error('Cycle detected in causal graph');
    }

    return result;
  }

  /**
   * Detect if graph has cycles
   */
  hasCycle(): boolean {
    try {
      this.topologicalSort();
      return false;
    } catch {
      return true;
    }
  }

  /**
   * Check if adding an edge would create a cycle
   */
  private wouldCreateCycle(from: string, to: string): boolean {
    // If 'to' is already an ancestor of 'from', adding edge would create cycle
    return this.isAncestorOf(to, from);
  }

  /**
   * Get all ancestors of an event
   */
  getAncestors(eventId: string): string[] {
    const ancestors = new Set<string>();
    const queue = [eventId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current)) continue;
      visited.add(current);

      const parents = this.getParents(current);
      for (const parent of parents) {
        ancestors.add(parent);
        queue.push(parent);
      }
    }

    return Array.from(ancestors);
  }

  /**
   * Get all descendants of an event
   */
  getDescendants(eventId: string): string[] {
    const descendants = new Set<string>();
    const queue = [eventId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current)) continue;
      visited.add(current);

      const children = this.getChildren(current);
      for (const child of children) {
        descendants.add(child);
        queue.push(child);
      }
    }

    return Array.from(descendants);
  }

  /**
   * Clear the graph
   */
  clear(): void {
    this.edges.clear();
    this.reverseEdges.clear();
  }

  /**
   * Get size of the graph
   */
  size(): number {
    const allNodes = new Set<string>();
    for (const [from, toSet] of this.edges) {
      allNodes.add(from);
      for (const to of toSet) {
        allNodes.add(to);
      }
    }
    return allNodes.size;
  }
}
