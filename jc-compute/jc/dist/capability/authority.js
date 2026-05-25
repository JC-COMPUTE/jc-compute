"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorityGuard = void 0;
class AuthorityGuard {
    constructor(capabilities) {
        this.capabilities = capabilities;
    }
    assertEventAuthorized(event) {
        if (!this.capabilities.validateEvent(event)) {
            throw new Error(`Event ${event.id} is not authorized`);
        }
    }
    filterAuthorized(events) {
        return events.filter(event => this.capabilities.validateEvent(event));
    }
}
exports.AuthorityGuard = AuthorityGuard;
//# sourceMappingURL=authority.js.map