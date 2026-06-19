import type { WindowAuthConfig } from '@proteo/types';

declare global {
  interface Window {
    BsAuthorizationConfig: WindowAuthConfig;
  }
}
