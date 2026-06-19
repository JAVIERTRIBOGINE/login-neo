import type { Action, Reducer } from './types/index.js';

export class StateManager {
  /*
   * Keeps the state of the application
   */
  private state: { [key: string]: unknown } = {};

  /*
   * Array of actions to be tracked
   */
  private listeners: Array<(state: { [key: string]: unknown }) => void> = [];

  /*
   * Contains all reducers registered
   */ private readonly reducers: { [key: string]: Reducer<unknown> } = {};

  /**
   * Initialize the proteo state manager as singleton
   */
  public static getInstance(): StateManager {
    if (!window.BsStateManager) {
      window.BsStateManager = new StateManager();
    }
    return window.BsStateManager;
  }

  /**
   * Retrieves the current state of the application.
   * @returns The current state object.
   */
  getState(): { [key: string]: unknown } {
    return this.state;
  }

  /**
   * Dispatches an action to update the state.
   * Each registered reducer will process this action to determine the new state.
   * If the state changes, all registered listeners will be notified of the new state.
   * @param action The action to dispatch.
   */
  dispatch(action: Action): void {
    const reducerKeys = Object.keys(this.reducers);
    let hasStateChanged = false;
    const newState = reducerKeys.reduce(
      (processedState, key) => {
        const reducer = this.reducers[key];
        const previousStateForKey = processedState[key];
        const nextStateForKey = reducer(previousStateForKey, action);

        hasStateChanged = hasStateChanged || nextStateForKey !== previousStateForKey;
        processedState[key] = nextStateForKey;

        return processedState;
      },
      { ...this.state }
    );

    if (hasStateChanged) {
      this.state = newState;
      this.listeners.forEach((listener) => listener(this.state));
    }
  }

  /**
   * Registers a listener that will be notified of any state changes.
   * @param listener The listener function to register.
   * @returns A function that, when called, will unsubscribe this listener.
   */
  subscribe(listener: (state: { [key: string]: unknown }) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Registers one or more reducers, each identified by a key. Each reducer will
   * manage the state corresponding to its key.
   * @param reducers An object mapping keys to reducer functions.
   */
  registerReducer<S>(reducers: { [key: string]: Reducer<S> }): void {
    Object.entries(reducers).forEach(([key, reducer]) => {
      if (!this.state[key]) {
        this.state[key] = {};
      }

      this.reducers[key] = reducer as Reducer<unknown>;
    });
  }
}
