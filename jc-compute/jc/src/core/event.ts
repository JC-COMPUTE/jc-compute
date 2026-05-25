import * as crypto from 'crypto';
import { CapabilityContext, CausalRef, Event } from '../types';

export class EventStore<E = unknown> {
  private events: Map<string, Readonly<Event<E>>> = new Map();
  private history: string[] = [];

  append(event: Event<E>): void {
    if (this.events.has(event.id)) {
      throw new Error(`Event ${event.id} already exists`);
    }

    const storedEvent: Event<E> = {
      ...event,
      timestamp: event.timestamp ?? Date.now()
    };
    storedEvent.hash = event.hash ?? EventHasher.hash(storedEvent);

    this.events.set(storedEvent.id, Object.freeze(storedEvent));
    this.history.push(storedEvent.id);
  }

  read(id: string): Event<E> | null {
    return this.events.get(id) ?? null;
  }

  readAll(): Event<E>[] {
    return this.history.map(id => this.events.get(id)!);
  }

  readRange(from: number, to: number): Event<E>[] {
    return this.history.slice(from, to + 1).map(id => this.events.get(id)!);
  }

  at(index: number): Event<E> | null {
    const id = this.history[index];
    return id ? this.events.get(id) ?? null : null;
  }

  count(): number {
    return this.history.length;
  }

  has(id: string): boolean {
    return this.events.has(id);
  }

  getHistory(): string[] {
    return [...this.history];
  }

  clear(): void {
    this.events.clear();
    this.history = [];
  }
}

export class EventHasher {
  static hash<E>(event: Event<E>): string {
    const data = JSON.stringify({
      id: event.id,
      type: event.type,
      payload: event.payload,
      timestamp: event.timestamp,
      parentEventId: event.parentEventId,
      parentEventIds: event.parentEventIds,
      causality: event.causality,
      capability: event.capability,
      principal: event.principal,
      reducerTarget: event.reducerTarget,
      metadata: event.metadata
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

export class EventFactory {
  static createEvent<T>(
    type: string,
    payload: T,
    options?: {
      id?: string;
      timestamp?: number;
      parentEventId?: string;
      parentEventIds?: string[];
      causality?: CausalRef[];
      capability?: CapabilityContext;
      principal?: string;
      reducerTarget?: string;
      metadata?: Record<string, unknown>;
    }
  ): Event<T> {
    return {
      id: options?.id ?? this.generateId(),
      type,
      payload,
      timestamp: options?.timestamp ?? Date.now(),
      parentEventId: options?.parentEventId,
      parentEventIds: options?.parentEventIds,
      causality: options?.causality,
      capability: options?.capability,
      principal: options?.principal,
      reducerTarget: options?.reducerTarget,
      metadata: options?.metadata
    };
  }

  static createChildEvent<T>(
    parentEventId: string,
    type: string,
    payload: T,
    options?: Omit<Parameters<typeof EventFactory.createEvent<T>>[2], 'parentEventId'>
  ): Event<T> {
    return this.createEvent(type, payload, { ...options, parentEventId });
  }

  static createMergeEvent<T>(
    parentEventIds: string[],
    type: string,
    payload: T,
    options?: Omit<Parameters<typeof EventFactory.createEvent<T>>[2], 'parentEventIds'>
  ): Event<T> {
    return this.createEvent(type, payload, { ...options, parentEventIds });
  }

  static generateId(): string {
    return `evt_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }
}

export class EventValidator {
  static validateStructure<T>(event: Event<T>): boolean {
    if (!event.id || !event.type) return false;
    if (event.timestamp !== undefined && typeof event.timestamp !== 'number') return false;
    if (event.parentEventIds !== undefined && !Array.isArray(event.parentEventIds)) return false;
    if (event.causality !== undefined && !Array.isArray(event.causality)) return false;
    return true;
  }

  static validateCausalReferences<T>(
    event: Event<T>,
    eventStore: EventStore<T>
  ): boolean {
    const parentIds = this.getParentIds(event);
    return parentIds.every(parentId => eventStore.has(parentId));
  }

  static getParentIds<T>(event: Event<T>): string[] {
    const parentIds = new Set<string>();

    if (event.parentEventId) parentIds.add(event.parentEventId);
    for (const id of event.parentEventIds ?? []) parentIds.add(id);
    for (const ref of event.causality ?? []) parentIds.add(ref.eventId);

    return [...parentIds];
  }

  static hasCycles<T>(
    eventId: string,
    eventStore: EventStore<T>,
    visiting: Set<string> = new Set(),
    visited: Set<string> = new Set()
  ): boolean {
    if (visiting.has(eventId)) return true;
    if (visited.has(eventId)) return false;

    const event = eventStore.read(eventId);
    if (!event) return false;

    visiting.add(eventId);
    for (const parentId of this.getParentIds(event)) {
      if (this.hasCycles(parentId, eventStore, visiting, visited)) return true;
    }
    visiting.delete(eventId);
    visited.add(eventId);

    return false;
  }
}
