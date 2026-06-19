import type { LoggerLevelConfiguration } from '@proteo/types';

/**
 * Log levels
 */
export enum LoggerLevel {
  trace = 'trace',
  debug = 'debug',
  info = 'info',
  warn = 'warn',
  error = 'error'
}

/**
 * Log levels configuration
 */
export const LoggerLevelConfig: { [level: number]: LoggerLevelConfiguration } = {
  10: { name: 'TRACE', action: 'trace', level: LoggerLevel.trace },
  20: { name: 'DEBUG', action: 'log', level: LoggerLevel.debug },
  30: { name: 'INFO', action: 'info', level: LoggerLevel.info },
  40: { name: 'WARN', action: 'warn', level: LoggerLevel.warn },
  50: { name: 'ERROR', action: 'error', level: LoggerLevel.error }
};

/**
 * Default level configuration
 */
export const DEFAULT_LEVEL = LoggerLevel['warn'];

/**
 * Default level configuration
 */
export const DEFAULT_LABEL = 'proteo-logger';

/**
 * Event for changing log level event
 */
export const EVENT_PROTEO_LOGGER_LEVEL_CHANGE = 'EVENT-PROTEO-LOGGER-LEVEL-CHANGE';

export const EVENT_PROTEO_LOGGER_LOG = 'EVENT_PROTEO_LOGGER_LOG';
