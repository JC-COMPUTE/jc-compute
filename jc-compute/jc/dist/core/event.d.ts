import { CapabilityContext, CausalRef, Event } from '../types';
export declare class EventStore<E = unknown> {
    private events;
    private history;
    append(event: Event<E>): void;
    read(id: string): Event<E> | null;
    readAll(): Event<E>[];
    readRange(from: number, to: number): Event<E>[];
    at(index: number): Event<E> | null;
    count(): number;
    has(id: string): boolean;
    getHistory(): string[];
    clear(): void;
}
export declare class EventHasher {
    static hash<E>(event: Event<E>): string;
}
export declare class EventFactory {
    static createEvent<T>(type: string, payload: T, options?: {
        id?: string;
        timestamp?: number;
        parentEventId?: string;
        parentEventIds?: string[];
        causality?: CausalRef[];
        capability?: CapabilityContext;
        principal?: string;
        reducerTarget?: string;
        metadata?: Record<string, unknown>;
    }): Event<T>;
    static createChildEvent<T>(parentEventId: string, type: string, payload: T, options?: Omit<Parameters<typeof EventFactory.createEvent<T>>[2], 'parentEventId'>): Event<T>;
    static createMergeEvent<T>(parentEventIds: string[], type: string, payload: T, options?: Omit<Parameters<typeof EventFactory.createEvent<T>>[2], 'parentEventIds'>): Event<T>;
    static generateId(): string;
}
export declare class EventValidator {
    static validateStructure<T>(event: Event<T>): boolean;
    static validateCausalReferences<T>(event: Event<T>, eventStore: EventStore<T>): boolean;
    static getParentIds<T>(event: Event<T>): string[];
    static hasCycles<T>(eventId: string, eventStore: EventStore<T>, visiting?: Set<string>, visited?: Set<string>): boolean;
}
//# sourceMappingURL=event.d.ts.map