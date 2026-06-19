import type { StateManager } from '@proteo/state-manager';
import type { WindowAuthConfig } from '@proteo/types';

declare global {
  interface Window {
    globalStore: StateManager;
    BsAuthorizationConfig: WindowAuthConfig;
  }
}
