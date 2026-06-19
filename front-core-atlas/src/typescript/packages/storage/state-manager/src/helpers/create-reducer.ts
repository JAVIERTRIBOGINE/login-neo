import type { Action, Reducer } from '../types/index.js';

type CaseHandlers<S> = {
  [type: string]: (state: S, action: Action<unknown>) => S;
};

/**
 * Creates a type-safe reducer from an initial state and a map of case handlers.
 * Each key in the handlers map corresponds to an action type.
 * Returns the current state unchanged for any unhandled action type.
 *
 * @example
 * const counterReducer = createReducer(0, {
 *   'counter/increment': (state, action) => state + (action.payload as number ?? 1),
 *   'counter/reset': () => 0,
 * });
 */
export function createReducer<S>(initialState: S, handlers: CaseHandlers<S>): Reducer<S> {
  return (state: S = initialState, action: Action<unknown>): S => {
    const handler = handlers[action.type];
    return handler ? handler(state, action) : state;
  };
}
