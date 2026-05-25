"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReducerValidator = exports.ReducerRegistry = void 0;
exports.combineReducers = combineReducers;
class ReducerRegistry {
    constructor() {
        this.reducers = new Map();
    }
    register(eventType, reducer) {
        if (this.reducers.has(eventType)) {
            throw new Error(`Reducer for ${eventType} already registered`);
        }
        this.reducers.set(eventType, reducer);
    }
    reduce(state, event) {
        const reducer = this.reducers.get(event.type);
        if (!reducer) {
            return state;
        }
        return reducer(state, event);
    }
    has(eventType) {
        return this.reducers.has(eventType);
    }
    clear() {
        this.reducers.clear();
    }
}
exports.ReducerRegistry = ReducerRegistry;
class ReducerValidator {
    static validateDeterminism(reducer, state, event) {
        const errors = [];
        const warnings = [];
        try {
            const first = reducer(structuredClone(state), structuredClone(event));
            const second = reducer(structuredClone(state), structuredClone(event));
            if (JSON.stringify(first) !== JSON.stringify(second)) {
                errors.push('Reducer produced different outputs for identical inputs');
            }
        }
        catch (error) {
            errors.push(`Reducer threw during validation: ${String(error)}`);
        }
        return { valid: errors.length === 0, errors, warnings };
    }
}
exports.ReducerValidator = ReducerValidator;
function combineReducers(reducers) {
    return (state, event, context) => {
        const reducer = reducers[event.type];
        return reducer ? reducer(state, event, context) : state;
    };
}
//# sourceMappingURL=reducer.js.map