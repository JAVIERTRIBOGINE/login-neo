import { ProteoComponentEvent } from '@proteo/event-decorators';
import type { LoggerCustomEvent, ProteoLoggerConfig, RemoteLogger } from '@proteo/types';
import { ConsoleFormattedStream, createLogger, type Logger } from 'browser-bunyan';
import {
  DEFAULT_LABEL,
  DEFAULT_LEVEL,
  EVENT_PROTEO_LOGGER_LEVEL_CHANGE,
  EVENT_PROTEO_LOGGER_LOG,
  LoggerLevel,
  LoggerLevelConfig
} from './constants.js';

/**
 * Logger utils class for implementation of LoggerUtils interface methods
 */
export class LoggerUtils {
  /**
   * Bunyan logger instance
   */
  private readonly _logger: Logger;

  /**
   * Listener to be destroyed
   */
  private readonly levelChangeListener: EventListener;

  /**
   * Constructor for class
   * @param conf Proteo Utils configuration
   */
  private constructor(conf?: ProteoLoggerConfig) {
    let loggerConf = conf;

    if (!loggerConf) {
      loggerConf = {
        name: DEFAULT_LABEL,
        level: DEFAULT_LEVEL
      };
    }

    this._logger = createLogger({
      name: loggerConf.name,
      level: loggerConf.level,
      src: false,
      streams: [
        {
          stream: new ConsoleFormattedStream({
            logByLevel: true
          })
        }
      ]
    });

    // Register global event for log level change on runtime
    this.levelChangeListener = this.handleLoggerLevelChange.bind(this);
    document.addEventListener(EVENT_PROTEO_LOGGER_LEVEL_CHANGE, this.levelChangeListener);
  }

  /**
   * Initialize the proteo logger with its configuration and saves it as singleton
   * @param conf th Logger configuration (name, level, etc)
   */
  public static initInstance(conf?: ProteoLoggerConfig): void {
    const instance = new LoggerUtils(conf);
    if (window.BsLoggerUtils) {
      window.BsLoggerUtils.destroy();
    }
    window.BsLoggerUtils = instance;
  }

  /**
   * Returns the instance class of LoggerUtils
   */
  public static getInstance(): LoggerUtils {
    if (!window.BsLoggerUtils) {
      LoggerUtils.initInstance();
    }
    return window.BsLoggerUtils;
  }

  /**
   * @deprecated Use getInstance instead
   */
  public static getSingleton(): LoggerUtils {
    return this.getInstance();
  }
  /**
   * Handles the document event for changing the log level
   * @param event Event with information of new level
   *
   */
  @ProteoComponentEvent()
  private handleLoggerLevelChange(event: Event | undefined): void {
    this._logger.debug(`[logger-utils] current log level <${JSON.stringify(LoggerLevelConfig[this._logger.level()])}>`);
    const evt = event as CustomEvent;
    if (evt.detail) {
      if (Object.values(LoggerLevel).includes(evt.detail)) {
        this._logger.level(evt.detail);
        this._logger.debug(
          `[logger-utils] changed log level to <${JSON.stringify(LoggerLevelConfig[this._logger.level()])}>`
        );
      } else {
        this._logger.error(`[logger-utils] Information provided in the event is incorrect:`, evt.detail);
      }
    } else {
      this._logger.error(`[logger-utils] There is no detail information into the event`);
    }
  }

  /**
   * Displays a trace message into the streams
   * @param message message to display
   * @param meta Additional information
   */
  public trace(message: string, ...meta: Array<unknown | RemoteLogger>): void {
    !meta.length ? this._logger.trace(message) : this._logger.trace(message, meta);
    this.sendLogEvent('trace', message, meta);
  }

  /**
   * Displays a debug message into the streams
   * @param message message to display
   * @param meta Additional information
   */
  public debug(message: string, ...meta: Array<unknown | RemoteLogger>): void {
    !meta.length ? this._logger.debug(message) : this._logger.debug(message, meta);
    this.sendLogEvent('debug', message, meta);
  }

  /**
   * Displays a info message into the streams
   * @param message message to display
   * @param meta Additional information
   */
  public info(message: string, ...meta: Array<unknown | RemoteLogger>): void {
    !meta.length ? this._logger.info(message) : this._logger.info(message, meta);
    this.sendLogEvent('info', message, meta);
  }

  /**
   * Displays a warn message into the streams
   * @param message message to display
   * @param meta Additional information
   */
  public warn(message: string, ...meta: Array<unknown | RemoteLogger>): void {
    !meta.length ? this._logger.warn(message) : this._logger.warn(message, meta);
    this.sendLogEvent('warn', message, meta);
  }

  /**
   * Displays a error message into the streams
   * @param message message to display
   * @param meta Additional information
   */
  public error(message: string, ...meta: Array<unknown | RemoteLogger>): void {
    !meta.length ? this._logger.error(message) : this._logger.error(message, meta);
    this.sendLogEvent('error', message, meta);
  }

  /**
   * Destroys all document Event Listeners
   * FIXME: Remove document usage from utils class
   */
  public destroy(): void {
    document.removeEventListener(EVENT_PROTEO_LOGGER_LEVEL_CHANGE, this.levelChangeListener);
  }

  private sendLogEvent(level: string, message: unknown, meta: Array<unknown | RemoteLogger>): void {
    const detail: LoggerCustomEvent = {
      message,
      meta,
      level
    };
    window.dispatchEvent(new CustomEvent<LoggerCustomEvent>(EVENT_PROTEO_LOGGER_LOG, { detail }));
  }
}
