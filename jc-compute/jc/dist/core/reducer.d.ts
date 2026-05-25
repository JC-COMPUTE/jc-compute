import { Event, Reducer, ValidationResult } from '../types';
export declare class ReducerRegistry<S> {
    private reducers;
    register<E>(eventType: string, reducer: Reducer<S, E>): void;
    reduce(state: S, event: Event<unknown>): S;
    has(eventType: string): boolean;
    clear(): void;
}
export declare class ReducerValidator {
    static validateDeterminism<S, E>(reducer: Reducer<S, E>, state: S, event: Event<E>): ValidationResult;
}
export declare function combineReducers<S>(reducers: Record<string, Reducer<S, unknown>>): Reducer<S, unknown>;
//# sourceMappingURL=reducer.d.ts.map