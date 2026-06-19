import { StateManager } from '../state-manager.js';
import type { Action } from '../../types/types';

const reducerTest = (state: unknown, action: Action<unknown>) => {
  switch (action.type) {
    case 'TEST':
      return action.payload;
    default:
      return state;
  }
};

describe('state-manager', () => {
  let stateManager: StateManager;
  beforeEach(() => {
    stateManager = new StateManager();
  });

  it('it should return the same state', () => {
    stateManager.registerReducer({ test: reducerTest });
    stateManager.dispatch({ type: 'TEST', payload: 'test' });
    stateManager.subscribe((state) => {
      expect(state).toEqual({ test: 'test' });
    });
  });

  it('it should return a new state', () => {
    const oldState = stateManager.getState();
    stateManager.dispatch({ type: 'TEST', payload: 'new value' });
    stateManager.subscribe((state) => {
      expect(state).not.toEqual(oldState);
    });
  });
});
