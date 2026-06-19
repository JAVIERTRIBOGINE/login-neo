export declare enum LoggerLevel {
  trace = 'trace',
  debug = 'debug',
  info = 'info',
  warn = 'warn',
  error = 'error'
}

/**
 * Model for typing logger configuration in proteo.config.json
 */
export interface ProteoLoggerConfig {
  name: string;
  level: LoggerLevel;
}

/**
 * Log Level configuration
 */
export interface LoggerLevelConfiguration {
  name: string;
  action: string;
  level: LoggerLevel;
  num?: string;
}
