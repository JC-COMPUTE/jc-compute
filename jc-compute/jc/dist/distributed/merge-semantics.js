"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MergeSemantics = void 0;
class MergeSemantics {
    static causalOrder(events) {
        return [...events].sort((a, b) => {
            const timeA = a.timestamp ?? 0;
            const timeB = b.timestamp ?? 0;
            if (timeA !== timeB)
                return timeA - timeB;
            return a.id.localeCompare(b.id);
        });
    }
    static merge(baseState, incomingEvents, reducer) {
        let finalState = baseState;
        const conflicts = [];
        let eventsApplied = 0;
        for (const event of this.causalOrder(incomingEvents)) {
            try {
                finalState = reducer(finalState, event, {
                    previousState: finalState,
                    currentEventId: event.id,
                    capability: event.capability,
                    principal: event.principal
                });
                eventsApplied += 1;
            }
            catch (error) {
                conflicts.push(`Event ${event.id}: ${String(error)}`);
            }
        }
        return {
            success: conflicts.length === 0,
            eventsApplied,
            conflicts,
            finalState
        };
    }
}
exports.MergeSemantics = MergeSemantics;
//# sourceMappingURL=merge-semantics.js.map