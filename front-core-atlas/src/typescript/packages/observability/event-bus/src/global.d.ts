import type { EventManager } from './event-manager.js';

declare global {
  interface Window {
    BsEventManager: EventManager;
    BsEventDictionary: Map<string, boolean>;
  }
}
