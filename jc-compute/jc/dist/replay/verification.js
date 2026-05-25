"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplayVerifier = void 0;
const event_1 = require("../core/event");
class ReplayVerifier {
    static verifyEvents(events) {
        const errors = [];
        const seen = new Set();
        for (const event of events) {
            if (!event_1.EventValidator.validateStructure(event)) {
                errors.push(`Invalid event structure: ${event.id}`);
            }
            const expectedHash = event_1.EventHasher.hash(event);
            if (event.hash && event.hash !== expectedHash) {
                return {
                    valid: false,
                    mismatchedAt: event.id,
                    expectedHash,
                    actualHash: event.hash,
                    errors: [`Hash mismatch for event ${event.id}`]
                };
            }
            for (const parentId of event_1.EventValidator.getParentIds(event)) {
                if (!seen.has(parentId)) {
                    errors.push(`Missing or future causal parent ${parentId} for event ${event.id}`);
                }
            }
            seen.add(event.id);
        }
        return { valid: errors.length === 0, errors };
    }
}
exports.ReplayVerifier = ReplayVerifier;
//# sourceMappingURL=verification.js.map