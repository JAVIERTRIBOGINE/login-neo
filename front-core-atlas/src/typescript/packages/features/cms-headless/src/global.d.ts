import type { CmsHeadless } from './cms-headless.js';

declare global {
  interface Window {
    BsCmsHeadless: CmsHeadless;
  }
}
