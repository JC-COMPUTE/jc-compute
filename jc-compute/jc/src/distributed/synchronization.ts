/**
 * Synchronization - Distributed state coordination
 */

import { Event, SyncMessage, SyncState } from '../types';
import { EventStore } from '../core/event';

/**
 * SyncManager - Coordinate distributed state across nodes
 */
export class SyncManager<E = any> {
  private nodeId: string;
  private eventStore: EventStore<E>;
  private syncStates: Map<string, SyncState> = new Map();
  private subscribers: Set<(message: SyncMessage<E>) => void> = new Set();

  constructor(config: { nodeId: string; eventStore: EventStore<E> }) {
    this.nodeId = config.nodeId;
    this.eventStore = config.eventStore;
  }

  /**
   * Create a sync message with events
   */
  createSyncMessage(
    _targetNodeId: string,
    fromEventId?: string,
    toEventId?: string
  ): SyncMessage<E> {
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
  processSyncMessage(message: SyncMessage<E>): {
    applied: number;
    errors: string[];
  } {
    const applied: string[] = [];
    const errors: string[] = [];

    for (const event of message.events) {
      try {
        // Check if event already exists
        if (this.eventStore.read(event.id)) {
          continue; // Skip duplicates
        }

        // Append event
        this.eventStore.append(event);
        applied.push(event.id);
      } catch (error) {
        errors.push(`Failed to apply event ${event.id}: ${error}`);
      }
    }

    // Update sync state
    this.updateSyncState(message.nodeId, {
      nodeId: message.nodeId,
      lastSyncEventId:
        message.events[message.events.length - 1]?.id || message.toEventId || '',
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
  requestSync(
    _targetNodeId: string,
    fromEventId?: string
  ): SyncMessage<E> {
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
  respondToSync(request: SyncMessage<E>): SyncMessage<E> {
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
  private getEventsRange(
    fromEventId?: string,
    toEventId?: string
  ): Event<E>[] {
    const allEvents = this.eventStore.readAll();

    if (!fromEventId && !toEventId) {
      return allEvents;
    }

    let startIndex = 0;
    let endIndex = allEvents.length - 1;

    if (fromEventId) {
      startIndex = allEvents.findIndex(e => e.id === fromEventId);
      if (startIndex === -1) startIndex = 0;
    }

    if (toEventId) {
      endIndex = allEvents.findIndex(e => e.id === toEventId);
      if (endIndex === -1) endIndex = allEvents.length - 1;
    }

    return allEvents.slice(startIndex, endIndex + 1);
  }

  /**
   * Update sync state for a node
   */
  private updateSyncState(nodeId: string, state: SyncState): void {
    this.syncStates.set(nodeId, state);
  }

  /**
   * Get sync state for a node
   */
  getSyncState(nodeId: string): SyncState | null {
    return this.syncStates.get(nodeId) || null;
  }

  /**
   * Get all sync states
   */
  getAllSyncStates(): SyncState[] {
    return Array.from(this.syncStates.values());
  }

  /**
   * Subscribe to sync messages
   */
  subscribe(handler: (message: SyncMessage<E>) => void): () => void {
    this.subscribers.add(handler);
    return () => this.subscribers.delete(handler);
  }

  /**
   * Broadcast sync message to subscribers
   */
  broadcast(message: SyncMessage<E>): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(message);
      } catch (error) {
        console.error('Sync subscriber error:', error);
      }
    }
  }

  /**
   * Check if node is synchronized with another node
   */
  isSynchronized(nodeId: string, tolerance = 5000): boolean {
    const syncState = this.getSyncState(nodeId);
    if (!syncState) return false;

    const timeSinceSync = Date.now() - syncState.lastSyncTimestamp;
    return timeSinceSync <= tolerance && syncState.pendingEvents.length === 0;
  }

  /**
   * Get missing events from another node
   */
  getMissingEvents(theirLastEventId: string): Event<E>[] {
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
  clear(): void {
    this.syncStates.clear();
  }
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
export class InMemoryTransport<E = any> implements NetworkTransport<E> {
  private nodes: Map<string, SyncManager<E>> = new Map();
  private handlers: Set<(message: SyncMessage<E>) => void> = new Set();

  registerNode(nodeId: string, syncManager: SyncManager<E>): void {
    this.nodes.set(nodeId, syncManager);
  }

  async send(nodeId: string, message: SyncMessage<E>): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.processSyncMessage(message);
    }

    // Also notify handlers
    for (const handler of this.handlers) {
      handler(message);
    }
  }

  async broadcast(message: SyncMessage<E>): Promise<void> {
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

  onMessage(handler: (message: SyncMessage<E>) => void): void {
    this.handlers.add(handler);
  }
}
