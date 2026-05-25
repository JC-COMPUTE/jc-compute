"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplayEngine = void 0;
const verification_1 = require("./verification");
class ReplayEngine {
    constructor(config) {
        this.config = config;
    }
    replay(replayConfig = {}) {
        const events = this.selectEvents(replayConfig);
        let state = this.config.initialState;
        let lastEventId;
        for (const event of events) {
            state = this.config.reducer(state, event, {
                previousState: state,
                currentEventId: event.id,
                capability: event.capability,
                principal: event.principal
            });
            lastEventId = event.id;
        }
        return {
            state,
            eventsApplied: events.length,
            lastEventId,
            verification: verification_1.ReplayVerifier.verifyEvents(events)
        };
    }
    replayTo(eventId) {
        return this.replay({ toEventId: eventId });
    }
    selectEvents(replayConfig) {
        const allEvents = this.config.eventStore.readAll();
        let startIndex = replayConfig.fromIndex ?? 0;
        let endIndex = replayConfig.toIndex ?? allEvents.length - 1;
        if (replayConfig.fromEventId) {
            const index = allEvents.findIndex(event => event.id === replayConfig.fromEventId);
            startIndex = index === -1 ? startIndex : index;
        }
        if (replayConfig.toEventId) {
            const index = allEvents.findIndex(event => event.id === replayConfig.toEventId);
            endIndex = index === -1 ? endIndex : index;
        }
        return allEvents.slice(startIndex, endIndex + 1);
    }
}
exports.ReplayEngine = ReplayEngine;
//# sourceMappingURL=replay-engine.js.map