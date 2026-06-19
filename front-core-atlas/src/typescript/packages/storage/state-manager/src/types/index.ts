export interface Action<T = unknown> {
  type: string;
  payload?: T;
}

export type Reducer<S, A = unknown> = (state: S, action: Action<A>) => S;

export interface Store<T> {
  getState: () => T;
  dispatch: (action: Action<T>) => void;
  subscribe: (listener: () => void) => () => void;
  addReducers: (reducers: { [key: string]: Reducer<unknown> }) => void;
}
