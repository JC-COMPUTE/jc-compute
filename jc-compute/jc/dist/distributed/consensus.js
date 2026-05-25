"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistributedNode = void 0;
const execution_1 = require("../core/execution");
const synchronization_1 = require("./synchronization");
class DistributedNode {
    constructor(config) {
        this.engine = new execution_1.JCCompute({
            initialState: config.initialState,
            reducer: config.reducer
        });
        this.sync = new synchronization_1.SyncManager({
            nodeId: config.nodeId,
            eventStore: this.engine.getEventStore()
        });
    }
    emit(event) {
        return this.engine.emit(event);
    }
    merge(events) {
        let applied = 0;
        for (const event of events) {
            if (this.engine.hasEvent(event.id))
                continue;
            this.engine.emit(event);
            applied += 1;
        }
        return applied;
    }
    verifyWith(peer) {
        const localState = JSON.stringify(this.engine.getState());
        const peerState = JSON.stringify(peer.engine.getState());
        return {
            verified: this.engine.verify() && peer.engine.verify(),
            statesMatch: localState === peerState,
            errors: localState === peerState ? [] : ['Node states differ']
        };
    }
}
exports.DistributedNode = DistributedNode;
//# sourceMappingURL=consensus.js.map