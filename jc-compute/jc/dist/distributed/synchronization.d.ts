/**
 * Synchronization - Distributed state coordination
 */
import { Event, SyncMessage, SyncState } from '../types';
import { EventStore } from '../core/event';
/**
 * SyncManager - Coordinate distributed state across nodes
 */
export declare class SyncManager<E = any> {
    private nodeId;
    private eventStore;
    private syncStates;
    private subscribers;
    constructor(config: {
        nodeId: string;
        eventStore: EventStore<E>;
    });
    /**
     * Create a sync message with events
     */
    createSyncMessage(_targetNodeId: string, fromEventId?: string, toEventId?: string): SyncMessage<E>;
    /**
     * Process incoming sync message
     */
    processSyncMessage(message: SyncMessage<E>): {
        applied: number;
        errors: string[];
    };
    /**
     * Request sync from another node
     */
    requestSync(_targetNodeId: string, fromEventId?: string): SyncMessage<E>;
    /**
     * Respond to sync request
     */
    respondToSync(request: SyncMessage<E>): SyncMessage<E>;
    /**
     * Get events in a range
     */
    private getEventsRange;
    /**
     * Update sync state for a node
     */
    private updateSyncState;
    /**
     * Get sync state for a node
     */
    getSyncState(nodeId: string): SyncState | null;
    /**
     * Get all sync states
     */
    getAllSyncStates(): SyncState[];
    /**
     * Subscribe to sync messages
     */
    subscribe(handler: (message: SyncMessage<E>) => void): () => void;
    /**
     * Broadcast sync message to subscribers
     */
    broadcast(message: SyncMessage<E>): void;
    /**
     * Check if node is synchronized with another node
     */
    isSynchronized(nodeId: string, tolerance?: number): boolean;
    /**
     * Get missing events from another node
     */
    getMissingEvents(theirLastEventId: string): Event<E>[];
    /**
     * Clear all sync states
     */
    clear(): void;
}
/**
 * Network Transport Interface
 */
export interface NetworkTransport<E = any> {
    send(nodeId: string, message: SyncMessage<E>): Promise<void>;
    broadcast(message: SyncMessage<E>): Promise<void>;
    onMessage(handler: (message: SyncMessage<E>) => void): void;
}
/**
 * In-memory network transport for testing
 */
export declare class InMemoryTransport<E = any> implements NetworkTransport<E> {
    private nodes;
    private handlers;
    registerNode(nodeId: string, syncManager: SyncManager<E>): void;
    send(nodeId: string, message: SyncMessage<E>): Promise<void>;
    broadcast(message: SyncMessage<E>): Promise<void>;
    onMessage(handler: (message: SyncMessage<E>) => void): void;
}
//# sourceMappingURL=synchronization.d.ts.map