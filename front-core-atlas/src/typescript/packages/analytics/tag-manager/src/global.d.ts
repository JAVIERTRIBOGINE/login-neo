import type { TagManager } from './tag-manager.js';

declare global {
  interface Window {
    BsTagManager: TagManager;
    _tempBSMAnalytics?: Record<string, unknown>;
  }
}
