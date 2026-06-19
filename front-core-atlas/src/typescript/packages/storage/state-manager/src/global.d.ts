import { StateManager } from './state-manager';

declare global {
  interface Window {
    BsStateManager: StateManager;
  }
}
