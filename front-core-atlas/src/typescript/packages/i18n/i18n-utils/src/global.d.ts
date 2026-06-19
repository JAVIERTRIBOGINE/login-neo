import type { I18n } from './i18n.js';

declare global {
  interface Window {
    BsI18n: I18n;
  }
}
