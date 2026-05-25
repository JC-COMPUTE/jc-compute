"use strict";
/**
 * Causal Graph - Track dependencies and ensure ordering
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CausalGraph = void 0;
/**
 * CausalGraph - Directed acyclic graph of event dependencies
 */
class CausalGraph {
    constructor() {
        this.edges = new Map();
        this.reverseEdges = new Map();
    }
    /**
     * Add a directed edge from parent to child
     */
    addEdge(from, to) {
        if (this.wouldCreateCycle(from, to)) {
            throw new Error(`Adding edge ${from} -> ${to} would create a cycle`);
        }
        if (!this.edges.has(from)) {
            this.edges.set(from, new Set());
        }
        this.edges.get(from).add(to);
        if (!this.reverseEdges.has(to)) {
            this.reverseEdges.set(to, new Set());
        }
        this.reverseEdges.get(to).add(from);
    }
    /**
     * Get all parents of an event
     */
    getParents(eventId) {
        const parents = this.reverseEdges.get(eventId);
        return parents ? Array.from(parents) : [];
    }
    /**
     * Get all children of an event
     */
    getChildren(eventId) {
        const children = this.edges.get(eventId);
        return children ? Array.from(children) : [];
    }
    /**
     * Check if there's a causal path from A to B
     */
    isAncestorOf(ancestor, descendant) {
        if (ancestor === descendant)
            return false;
        const visited = new Set();
        const queue = [ancestor];
        while (queue.length > 0) {
            const current = queue.shift();
            if (current === descendant)
                return true;
            if (visited.has(current))
                continue;
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
    isOrdered(a, b) {
        return this.isAncestorOf(a, b);
    }
    /**
     * Get topological sort of all events
     */
    topologicalSort() {
        const allNodes = new Set();
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
        const inDegree = new Map();
        for (const node of allNodes) {
            inDegree.set(node, this.getParents(node).length);
        }
        const queue = Array.from(allNodes).filter(node => inDegree.get(node) === 0);
        const result = [];
        while (queue.length > 0) {
            const current = queue.shift();
            result.push(current);
            const children = this.getChildren(current);
            for (const child of children) {
                const newInDegree = inDegree.get(child) - 1;
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
    hasCycle() {
        try {
            this.topologicalSort();
            return false;
        }
        catch {
            return true;
        }
    }
    /**
     * Check if adding an edge would create a cycle
     */
    wouldCreateCycle(from, to) {
        // If 'to' is already an ancestor of 'from', adding edge would create cycle
        return this.isAncestorOf(to, from);
    }
    /**
     * Get all ancestors of an event
     */
    getAncestors(eventId) {
        const ancestors = new Set();
        const queue = [eventId];
        const visited = new Set();
        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current))
                continue;
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
    getDescendants(eventId) {
        const descendants = new Set();
        const queue = [eventId];
        const visited = new Set();
        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current))
                continue;
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
    clear() {
        this.edges.clear();
        this.reverseEdges.clear();
    }
    /**
     * Get size of the graph
     */
    size() {
        const allNodes = new Set();
        for (const [from, toSet] of this.edges) {
            allNodes.add(from);
            for (const to of toSet) {
                allNodes.add(to);
            }
        }
        return allNodes.size;
    }
}
exports.CausalGraph = CausalGraph;
//# sourceMappingURL=causal-graph.js.map