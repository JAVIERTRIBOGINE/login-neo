/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MaintenanceCause, type BaseAppConfig } from '@proteo/types';

jest.useFakeTimers();

const spyError = jest.fn();
const spyDebug = jest.fn();
const spyInfo = jest.fn();

jest.unstable_mockModule('@proteo/logger-utils', () => ({
  LoggerUtils: {
    getInstance: jest.fn().mockReturnValue({
      error: spyError,
      debug: spyDebug,
      info: spyInfo
    })
  }
}));

let isNativeMock = false;
jest.unstable_mockModule('@proteo/platform-utils', () => ({
  isNative: jest.fn(() => isNativeMock)
}));

let appendScriptScenario = 'success';
let failScriptId: string | null = null;

jest.unstable_mockModule('@proteo/script-initialization-util', () => ({
  appendElementScript: jest.fn((scriptElement: any) => {
    if (failScriptId && scriptElement.id === failScriptId) {
      return Promise.reject([false, 'script-error']);
    }
    if (appendScriptScenario === 'already-included') {
      return Promise.reject([false, 'script-already-included']);
    }
    if (appendScriptScenario === 'error') {
      return Promise.reject([false, 'script-error']);
    }
    return Promise.resolve(true);
  })
}));

const mockConfig: BaseAppConfig = {
  APP_CONFIG: { NAME: 'mock_app', DEFAULT_LOCALE: 'es', VERSION: '0.0.1' },
  CONFIG_VERSION: '0.0.1',
  DATAMANAGER_CONFIG: {
    SAMPLE_DRIVER: { BASE_PATH: 'mock_base', HOST: 'mock_host', REQUEST_TIMEOUT: 890999, DRIVER: 'P4' }
  },
  LOGGING_CONFIG: {
    LOG_LEVEL: '' as any,
    API_ENABLED: true,
    API_LOG_LEVEL: 'error' as any,
    API_FW_LOG_LEVEL: 'error' as any,
    DATAMANAGER_APP: 'TEST',
    DATAMANAGER_CORE: 'TEST'
  },
  KEEP_ALIVE_CONFIG: { REFRESH_TIMER: 100 },
  MAINTENANCE_CONFIG: { TYPE: 'local', ENABLED: false, CAUSE: MaintenanceCause.all_services_maintenance },
  TAG_MANAGER_CONFIG: { DRIVERS: [{ DRIVER: 'TXP4', CLASS: ['class'] }] }
};

describe('dynatrace-initializer', () => {
  let initializeDynatrace: any;

  beforeEach(async () => {
    jest.resetModules();
    ({ initializeDynatrace } = await import('../dynatrace-initializer.js'));

    isNativeMock = false;
    appendScriptScenario = 'success';
    failScriptId = null;
    spyError.mockClear();
    spyDebug.mockClear();
    spyInfo.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return false and log error when Dynatrace is not activated', async () => {
    expect.assertions(3);
    mockConfig.DYNATRACE_CONFIG = { ACTIVATED: false };

    const result = await initializeDynatrace(mockConfig);

    expect(result).toBe(false);
    expect(spyError).toHaveBeenCalledTimes(1);
    expect(spyError).toHaveBeenCalledWith(expect.stringContaining('not initialize Dynatrace'), expect.any(Object));
  });

  it('should return false and log error when Dynatrace configuration is missing', async () => {
    expect.assertions(3);
    mockConfig.DYNATRACE_CONFIG = undefined;

    const result = await initializeDynatrace(mockConfig);

    expect(result).toBe(false);
    expect(spyError).toHaveBeenCalledTimes(1);
    expect(spyDebug).not.toHaveBeenCalled();
  });

  it('should resolve and log debug when Dynatrace is activated (Web environment)', async () => {
    expect.assertions(3);
    mockConfig.DYNATRACE_CONFIG = { ACTIVATED: true };

    const result = await initializeDynatrace(mockConfig);

    expect(result).toBe(true);
    expect(spyError).toHaveBeenCalledTimes(0);
    expect(spyDebug).toHaveBeenCalledWith(expect.stringContaining('Javascript file added: dynatraceJS'), expect.any(Object));
  });

  it('should load main script AND native wrapper when running in Native environment', async () => {
    expect.assertions(4);
    mockConfig.DYNATRACE_CONFIG = { ACTIVATED: true };
    isNativeMock = true;

    const result = await initializeDynatrace(mockConfig);

    expect(result).toBe(true);
    expect(spyError).toHaveBeenCalledTimes(0);
    expect(spyDebug).toHaveBeenCalledWith(expect.stringContaining('Javascript file added: dynatraceJS'), expect.any(Object));
    expect(spyDebug).toHaveBeenCalledWith(expect.stringContaining('Javascript file added: dynatraceNativeWrapperJS'), expect.any(Object));
  });

  it('should catch the "script-already-included" rejection, log info, and return true without erroring', async () => {
    expect.assertions(3);
    mockConfig.DYNATRACE_CONFIG = { ACTIVATED: true };
    appendScriptScenario = 'already-included';

    const result = await initializeDynatrace(mockConfig);

    expect(result).toBe(true);
    expect(spyError).toHaveBeenCalledTimes(0);
    expect(spyInfo).toHaveBeenCalledWith(expect.stringContaining('Javascript file already added: dynatraceJS'), expect.any(Object));
  });

  it('should return false if the main dynatrace script fails to load', async () => {
    expect.assertions(3);
    mockConfig.DYNATRACE_CONFIG = { ACTIVATED: true };
    failScriptId = 'dynatraceJS';

    const result = await initializeDynatrace(mockConfig);

    expect(result).toBe(false);
    expect(spyError).toHaveBeenCalledTimes(1);
    expect(spyError).toHaveBeenCalledWith(expect.stringContaining('Error initializing main Dynatrace script'), expect.any(Object));
  });

  it('should return true even if the native wrapper fails to load (Isolation test)', async () => {
    expect.assertions(4);
    mockConfig.DYNATRACE_CONFIG = { ACTIVATED: true };
    isNativeMock = true;
    failScriptId = 'dynatraceNativeWrapperJS';

    const result = await initializeDynatrace(mockConfig);

    expect(result).toBe(true);

    expect(spyError).toHaveBeenCalledTimes(1);
    expect(spyError).toHaveBeenCalledWith(expect.stringContaining('native wrapper script'), expect.any(Object));

    expect(spyDebug).toHaveBeenCalledWith(expect.stringContaining('dynatraceJS'), expect.any(Object));
  });
});
