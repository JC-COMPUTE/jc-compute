import { Event, Reducer, ValidationResult } from '../types';

export class ReducerRegistry<S> {
  private reducers = new Map<string, Reducer<S, unknown>>();

  register<E>(eventType: string, reducer: Reducer<S, E>): void {
    if (this.reducers.has(eventType)) {
      throw new Error(`Reducer for ${eventType} already registered`);
    }
    this.reducers.set(eventType, reducer as Reducer<S, unknown>);
  }

  reduce(state: S, event: Event<unknown>): S {
    const reducer = this.reducers.get(event.type);
    if (!reducer) {
      return state;
    }
    return reducer(state, event);
  }

  has(eventType: string): boolean {
    return this.reducers.has(eventType);
  }

  clear(): void {
    this.reducers.clear();
  }
}

export class ReducerValidator {
  static validateDeterminism<S, E>(
    reducer: Reducer<S, E>,
    state: S,
    event: Event<E>
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const first = reducer(structuredClone(state), structuredClone(event));
      const second = reducer(structuredClone(state), structuredClone(event));

      if (JSON.stringify(first) !== JSON.stringify(second)) {
        errors.push('Reducer produced different outputs for identical inputs');
      }
    } catch (error) {
      errors.push(`Reducer threw during validation: ${String(error)}`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}

export function combineReducers<S>(
  reducers: Record<string, Reducer<S, unknown>>
): Reducer<S, unknown> {
  return (state, event, context) => {
    const reducer = reducers[event.type];
    return reducer ? reducer(state, event, context) : state;
  };
}
