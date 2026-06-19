import type { Action } from '../types/index.js';

/**
 * Creates a typed action creator for a given action type.
 *
 * @example
 * const increment = createAction<number>('counter/increment');
 * increment(5); // { type: 'counter/increment', payload: 5 }
 * increment();  // { type: 'counter/increment' }
 */
export function createAction<P = void>(type: string): (payload?: P) => Action<P> {
  return (payload?: P): Action<P> => (payload !== undefined ? { type, payload } : { type });
}
