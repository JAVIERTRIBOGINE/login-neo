import type { LoggerUtils } from './logger-utils.js';

declare global {
  interface Window {
    BsLoggerUtils: LoggerUtils;
  }
}
