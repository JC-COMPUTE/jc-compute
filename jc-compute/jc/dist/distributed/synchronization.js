"use strict";
/**
 * Synchronization - Distributed state coordination
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryTransport = exports.SyncManager = void 0;
/**
 * SyncManager - Coordinate distributed state across nodes
 */
class SyncManager {
    constructor(config) {
        this.syncStates = new Map();
        this.subscribers = new Set();
        this.nodeId = config.nodeId;
        this.eventStore = config.eventStore;
    }
    /**
     * Create a sync message with events
     */
    createSyncMessage(_targetNodeId, fromEventId, toEventId) {
        const events = this.getEventsRange(fromEventId, toEventId);
        return {
            type: 'sync',
            events,
            fromEventId,
            toEventId,
            nodeId: this.nodeId,
            timestamp: Date.now()
        };
    }
    /**
     * Process incoming sync message
     */
    processSyncMessage(message) {
        const applied = [];
        const errors = [];
        for (const event of message.events) {
            try {
                // Check if event already exists
                if (this.eventStore.read(event.id)) {
                    continue; // Skip duplicates
                }
                // Append event
                this.eventStore.append(event);
                applied.push(event.id);
            }
            catch (error) {
                errors.push(`Failed to apply event ${event.id}: ${error}`);
            }
        }
        // Update sync state
        this.updateSyncState(message.nodeId, {
            nodeId: message.nodeId,
            lastSyncEventId: message.events[message.events.length - 1]?.id || message.toEventId || '',
            lastSyncTimestamp: message.timestamp,
            pendingEvents: []
        });
        return {
            applied: applied.length,
            errors
        };
    }
    /**
     * Request sync from another node
     */
    requestSync(_targetNodeId, fromEventId) {
        return {
            type: 'request',
            events: [],
            fromEventId,
            nodeId: this.nodeId,
            timestamp: Date.now()
        };
    }
    /**
     * Respond to sync request
     */
    respondToSync(request) {
        const events = this.getEventsRange(request.fromEventId);
        return {
            type: 'response',
            events,
            fromEventId: request.fromEventId,
            nodeId: this.nodeId,
            timestamp: Date.now()
        };
    }
    /**
     * Get events in a range
     */
    getEventsRange(fromEventId, toEventId) {
        const allEvents = this.eventStore.readAll();
        if (!fromEventId && !toEventId) {
            return allEvents;
        }
        let startIndex = 0;
        let endIndex = allEvents.length - 1;
        if (fromEventId) {
            startIndex = allEvents.findIndex(e => e.id === fromEventId);
            if (startIndex === -1)
                startIndex = 0;
        }
        if (toEventId) {
            endIndex = allEvents.findIndex(e => e.id === toEventId);
            if (endIndex === -1)
                endIndex = allEvents.length - 1;
        }
        return allEvents.slice(startIndex, endIndex + 1);
    }
    /**
     * Update sync state for a node
     */
    updateSyncState(nodeId, state) {
        this.syncStates.set(nodeId, state);
    }
    /**
     * Get sync state for a node
     */
    getSyncState(nodeId) {
        return this.syncStates.get(nodeId) || null;
    }
    /**
     * Get all sync states
     */
    getAllSyncStates() {
        return Array.from(this.syncStates.values());
    }
    /**
     * Subscribe to sync messages
     */
    subscribe(handler) {
        this.subscribers.add(handler);
        return () => this.subscribers.delete(handler);
    }
    /**
     * Broadcast sync message to subscribers
     */
    broadcast(message) {
        for (const subscriber of this.subscribers) {
            try {
                subscriber(message);
            }
            catch (error) {
                console.error('Sync subscriber error:', error);
            }
        }
    }
    /**
     * Check if node is synchronized with another node
     */
    isSynchronized(nodeId, tolerance = 5000) {
        const syncState = this.getSyncState(nodeId);
        if (!syncState)
            return false;
        const timeSinceSync = Date.now() - syncState.lastSyncTimestamp;
        return timeSinceSync <= tolerance && syncState.pendingEvents.length === 0;
    }
    /**
     * Get missing events from another node
     */
    getMissingEvents(theirLastEventId) {
        const allEvents = this.eventStore.readAll();
        const theirLastIndex = allEvents.findIndex(e => e.id === theirLastEventId);
        if (theirLastIndex === -1) {
            return allEvents; // They have none of our events
        }
        return allEvents.slice(theirLastIndex + 1);
    }
    /**
     * Clear all sync states
     */
    clear() {
        this.syncStates.clear();
    }
}
exports.SyncManager = SyncManager;
/**
 * In-memory network transport for testing
 */
class InMemoryTransport {
    constructor() {
        this.nodes = new Map();
        this.handlers = new Set();
    }
    registerNode(nodeId, syncManager) {
        this.nodes.set(nodeId, syncManager);
    }
    async send(nodeId, message) {
        const node = this.nodes.get(nodeId);
        if (node) {
            node.processSyncMessage(message);
        }
        // Also notify handlers
        for (const handler of this.handlers) {
            handler(message);
        }
    }
    async broadcast(message) {
        for (const [nodeId, node] of this.nodes) {
            if (nodeId !== message.nodeId) {
                node.processSyncMessage(message);
            }
        }
        // Also notify handlers
        for (const handler of this.handlers) {
            handler(message);
        }
    }
    onMessage(handler) {
        this.handlers.add(handler);
    }
}
exports.InMemoryTransport = InMemoryTransport;
//# sourceMappingURL=synchronization.js.map