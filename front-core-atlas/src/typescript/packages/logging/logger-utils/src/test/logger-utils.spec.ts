import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { EVENT_PROTEO_LOGGER_LEVEL_CHANGE, EVENT_PROTEO_LOGGER_LOG, LoggerLevel } from '../constants.js';
import { LoggerUtils } from '../logger-utils.js';

type ConsoleSpy = typeof console.log | typeof console.warn | typeof console.error | typeof console.info;

/**
 * Custom toHaveBeenCalledWith, but ignoring the arg position
 * @param spy the jest mock instance
 * @param param the string to be checked
 */
const toHaveBeenCalledSomeParamWith = (spy: jest.Mocked<ConsoleSpy>, param: string) => {
  expect(spy.mock.calls[0].some((e: string) => e.includes(param))).toBe(true);
};

const loggerEventParams = {
  message: 'This is my message',
  meta: [
    { something: 'something to say' },
    {
      type: 'access',
      url: 'url',
      method: 'request.method',
      headers: {}
    }
  ]
};

const validateLogEvent = function (level: LoggerLevel) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (e: any) {
    expect(e.detail.level).toEqual(level);
    expect(e.detail.message).toEqual(loggerEventParams.message);
    expect(e.detail.meta).toEqual(loggerEventParams.meta);
  };
};
const validateErrorLogEvent = validateLogEvent(LoggerLevel.error);
const validateDebugLogEvent = validateLogEvent(LoggerLevel.debug);
const validateInfoLogEvent = validateLogEvent(LoggerLevel.info);
const validateWarnLogEvent = validateLogEvent(LoggerLevel.warn);

describe('logger-utils', () => {
  let consoleSpy: jest.Mocked<ConsoleSpy>;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should create a bunyan logger with default values when there is no configuration for logger', () => {
    expect.assertions(1);
    expect(LoggerUtils.getInstance()).toBeDefined();
  });

  describe('', () => {
    beforeEach(() => {
      LoggerUtils.initInstance();
    });

    it('Should return instance with getSingleton method', () => {
      expect.assertions(1);
      const instance = LoggerUtils.getSingleton();
      expect(instance).toBeInstanceOf(LoggerUtils);
    });

    it('Should create a bunyan logger with custom values when there configuration for logger is provided', () => {
      expect.assertions(2);
      consoleSpy = jest.spyOn(console, 'debug') as jest.Mocked<ConsoleSpy>;
      consoleSpy.mockClear();
      LoggerUtils.initInstance({
        level: LoggerLevel.debug,
        name: 'CustomLogger'
      });
      const instance = LoggerUtils.getInstance();
      expect(instance).toBeDefined();
      instance.debug(`debug`);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('Should execute console error when printing errors', () => {
      const instance = LoggerUtils.getInstance();
      consoleSpy = jest.spyOn(console, 'error') as jest.Mocked<ConsoleSpy>;
      consoleSpy.mockClear();
      expect.assertions(3);
      instance.error(`error`);
      toHaveBeenCalledSomeParamWith(consoleSpy, 'error');
      consoleSpy.mockClear();
      instance.error(`error: ${{ error: 'error' }}`);
      toHaveBeenCalledSomeParamWith(consoleSpy, 'error: [object Object]');
      consoleSpy.mockClear();
      instance.error(`error:`, { error: 'error' });
      toHaveBeenCalledSomeParamWith(consoleSpy, 'error: [ {"error":"error"} ]');
    });

    it('Should execute console warn when printing warning', () => {
      const instance = LoggerUtils.getInstance();
      consoleSpy = jest.spyOn(console, 'warn') as jest.Mocked<ConsoleSpy>;
      consoleSpy.mockClear();
      expect.assertions(3);
      instance.warn(`warn`);
      toHaveBeenCalledSomeParamWith(consoleSpy, 'warn');
      consoleSpy.mockClear();
      instance.warn(`warn: ${{ warn: 'warn' }}`);
      toHaveBeenCalledSomeParamWith(consoleSpy, 'warn: [object Object]');
      consoleSpy.mockClear();
      instance.warn(`warn:`, { warn: 'warn' });
      toHaveBeenCalledSomeParamWith(consoleSpy, 'warn: [ {"warn":"warn"} ]');
    });

    it('Should not call console log because by default the info level  is disabled', () => {
      const instance = LoggerUtils.getInstance();
      consoleSpy = jest.spyOn(console, 'info') as jest.Mocked<ConsoleSpy>;
      consoleSpy.mockClear();
      expect.assertions(3);
      instance.info(`info`);
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockClear();
      instance.info(`info: ${{ info: 'info' }}`);
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockClear();
      instance.info(`info:`, { info: 'info' });
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('Should not call console log because by default the debug level is disabled', () => {
      const instance = LoggerUtils.getInstance();
      consoleSpy = jest.spyOn(console, 'debug') as jest.Mocked<ConsoleSpy>;
      consoleSpy.mockClear();
      expect.assertions(3);
      instance.debug(`debug`);
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockClear();
      instance.debug(`debug: ${{ debug: 'debug' }}`);
      consoleSpy.mockClear();
      expect(consoleSpy).not.toHaveBeenCalled();
      instance.debug(`debug:`, { debug: 'debug' });
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('Should not call console log because by default the trace level is disabled', () => {
      const instance = LoggerUtils.getInstance();
      consoleSpy = jest.spyOn(console, 'trace') as jest.Mocked<ConsoleSpy>;
      consoleSpy.mockClear();
      expect.assertions(3);
      instance.trace(`trace`);
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockClear();
      instance.trace(`trace: ${{ trace: 'trace' }}`);
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockClear();
      instance.trace(`trace:`, { trace: 'trace' });
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('Should change the log level when global event is received', () => {
      const instance = LoggerUtils.getInstance();
      consoleSpy = jest.spyOn(console, 'debug') as jest.Mocked<ConsoleSpy>;
      consoleSpy.mockClear();
      instance.debug(`debug`);
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockClear();
      document.dispatchEvent(new CustomEvent(EVENT_PROTEO_LOGGER_LEVEL_CHANGE, { detail: 'debug' }));
      instance.debug(`debug`);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('Should print an error if the detail is not configured', () => {
      consoleSpy = jest.spyOn(console, 'error') as jest.Mocked<ConsoleSpy>;
      consoleSpy.mockClear();
      document.dispatchEvent(new CustomEvent(EVENT_PROTEO_LOGGER_LEVEL_CHANGE));
      toHaveBeenCalledSomeParamWith(consoleSpy, 'There is no detail information into the event');
    });

    it('Should print an error if the level passed is incorrect', () => {
      consoleSpy = jest.spyOn(console, 'error') as jest.Mocked<ConsoleSpy>;
      consoleSpy.mockClear();
      document.dispatchEvent(new CustomEvent(EVENT_PROTEO_LOGGER_LEVEL_CHANGE, { detail: 'invalid' }));
      toHaveBeenCalledSomeParamWith(consoleSpy, 'Information provided in the event is incorrect');
    });

    it('should throw a logger event of type ERROR when log error', (done) => {
      expect.assertions(3);
      const instance = LoggerUtils.getInstance();

      window.addEventListener(EVENT_PROTEO_LOGGER_LOG, function callback(e) {
        validateErrorLogEvent(e);
        window.removeEventListener(EVENT_PROTEO_LOGGER_LOG, callback);
        done();
      });
      instance.error(loggerEventParams.message, ...loggerEventParams.meta);
    });

    it('should throw a logger event of type DEBUG when log debug', (done) => {
      expect.assertions(3);
      const instance = LoggerUtils.getInstance();

      window.addEventListener(EVENT_PROTEO_LOGGER_LOG, function callback(e) {
        validateDebugLogEvent(e);
        window.removeEventListener(EVENT_PROTEO_LOGGER_LOG, callback);
        done();
      });
      instance.debug(loggerEventParams.message, ...loggerEventParams.meta);
    });

    it('should throw a logger event of type WARN when log warn', (done) => {
      expect.assertions(3);
      const instance = LoggerUtils.getInstance();

      window.addEventListener(EVENT_PROTEO_LOGGER_LOG, function callback(e) {
        validateWarnLogEvent(e);
        window.removeEventListener(EVENT_PROTEO_LOGGER_LOG, callback);
        done();
      });
      instance.warn(loggerEventParams.message, ...loggerEventParams.meta);
    });

    it('should throw a logger event of type INFO when log info', (done) => {
      expect.assertions(3);
      const instance = LoggerUtils.getInstance();

      window.addEventListener(EVENT_PROTEO_LOGGER_LOG, function callback(e) {
        validateInfoLogEvent(e);
        window.removeEventListener(EVENT_PROTEO_LOGGER_LOG, callback);
        done();
      });
      instance.info(loggerEventParams.message, ...loggerEventParams.meta);
    });
  });
});
