"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventValidator = exports.EventFactory = exports.EventHasher = exports.EventStore = void 0;
const crypto = __importStar(require("crypto"));
class EventStore {
    constructor() {
        this.events = new Map();
        this.history = [];
    }
    append(event) {
        if (this.events.has(event.id)) {
            throw new Error(`Event ${event.id} already exists`);
        }
        const storedEvent = {
            ...event,
            timestamp: event.timestamp ?? Date.now()
        };
        storedEvent.hash = event.hash ?? EventHasher.hash(storedEvent);
        this.events.set(storedEvent.id, Object.freeze(storedEvent));
        this.history.push(storedEvent.id);
    }
    read(id) {
        return this.events.get(id) ?? null;
    }
    readAll() {
        return this.history.map(id => this.events.get(id));
    }
    readRange(from, to) {
        return this.history.slice(from, to + 1).map(id => this.events.get(id));
    }
    at(index) {
        const id = this.history[index];
        return id ? this.events.get(id) ?? null : null;
    }
    count() {
        return this.history.length;
    }
    has(id) {
        return this.events.has(id);
    }
    getHistory() {
        return [...this.history];
    }
    clear() {
        this.events.clear();
        this.history = [];
    }
}
exports.EventStore = EventStore;
class EventHasher {
    static hash(event) {
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
exports.EventHasher = EventHasher;
class EventFactory {
    static createEvent(type, payload, options) {
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
    static createChildEvent(parentEventId, type, payload, options) {
        return this.createEvent(type, payload, { ...options, parentEventId });
    }
    static createMergeEvent(parentEventIds, type, payload, options) {
        return this.createEvent(type, payload, { ...options, parentEventIds });
    }
    static generateId() {
        return `evt_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    }
}
exports.EventFactory = EventFactory;
class EventValidator {
    static validateStructure(event) {
        if (!event.id || !event.type)
            return false;
        if (event.timestamp !== undefined && typeof event.timestamp !== 'number')
            return false;
        if (event.parentEventIds !== undefined && !Array.isArray(event.parentEventIds))
            return false;
        if (event.causality !== undefined && !Array.isArray(event.causality))
            return false;
        return true;
    }
    static validateCausalReferences(event, eventStore) {
        const parentIds = this.getParentIds(event);
        return parentIds.every(parentId => eventStore.has(parentId));
    }
    static getParentIds(event) {
        const parentIds = new Set();
        if (event.parentEventId)
            parentIds.add(event.parentEventId);
        for (const id of event.parentEventIds ?? [])
            parentIds.add(id);
        for (const ref of event.causality ?? [])
            parentIds.add(ref.eventId);
        return [...parentIds];
    }
    static hasCycles(eventId, eventStore, visiting = new Set(), visited = new Set()) {
        if (visiting.has(eventId))
            return true;
        if (visited.has(eventId))
            return false;
        const event = eventStore.read(eventId);
        if (!event)
            return false;
        visiting.add(eventId);
        for (const parentId of this.getParentIds(event)) {
            if (this.hasCycles(parentId, eventStore, visiting, visited))
                return true;
        }
        visiting.delete(eventId);
        visited.add(eventId);
        return false;
    }
}
exports.EventValidator = EventValidator;
//# sourceMappingURL=event.js.map