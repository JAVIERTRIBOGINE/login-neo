import type { KeepAlive } from './keep-alive.js';

declare global {
  interface Window {
    BsKeepAliveUtils: KeepAlive;
  }
}
