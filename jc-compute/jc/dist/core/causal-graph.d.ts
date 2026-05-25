/**
 * Causal Graph - Track dependencies and ensure ordering
 */
/**
 * CausalGraph - Directed acyclic graph of event dependencies
 */
export declare class CausalGraph {
    private edges;
    private reverseEdges;
    /**
     * Add a directed edge from parent to child
     */
    addEdge(from: string, to: string): void;
    /**
     * Get all parents of an event
     */
    getParents(eventId: string): string[];
    /**
     * Get all children of an event
     */
    getChildren(eventId: string): string[];
    /**
     * Check if there's a causal path from A to B
     */
    isAncestorOf(ancestor: string, descendant: string): boolean;
    /**
     * Check if two events are causally ordered
     * Returns true if there's a causal path from a to b
     */
    isOrdered(a: string, b: string): boolean;
    /**
     * Get topological sort of all events
     */
    topologicalSort(): string[];
    /**
     * Detect if graph has cycles
     */
    hasCycle(): boolean;
    /**
     * Check if adding an edge would create a cycle
     */
    private wouldCreateCycle;
    /**
     * Get all ancestors of an event
     */
    getAncestors(eventId: string): string[];
    /**
     * Get all descendants of an event
     */
    getDescendants(eventId: string): string[];
    /**
     * Clear the graph
     */
    clear(): void;
    /**
     * Get size of the graph
     */
    size(): number;
}
//# sourceMappingURL=causal-graph.d.ts.map