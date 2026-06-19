import type { FeatureManager } from './feature-manager.js';

declare global {
  interface Window {
    BsFeatureManager: FeatureManager;
  }
}
