import type { BsMfeRegistry } from './lib/utils/mfe-registry/mfe-log.store.js';

declare global {
  interface Window {
    BsMfeRegistry: typeof BsMfeRegistry;
  }
}
