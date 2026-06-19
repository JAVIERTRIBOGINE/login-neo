/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';
import { MaintenanceCause, type BaseAppConfig } from '@proteo/types';
import { initializeBioCatch, initializeBioCatchBSO } from '../biocatch-util';
import { isNative, isWebContainer } from '@proteo/platform-utils';
import { LoggerUtils, LoggerLevel } from '@proteo/logger-utils';
import type { MockInstance } from 'jest-mock';

jest.useFakeTimers();

const mockConfig: BaseAppConfig = {
  APP_CONFIG: {
    NAME: 'mock_app',
    DEFAULT_LOCALE: 'es',
    VERSION: '0.0.1'
  },
  CONFIG_VERSION: '0.0.1',
  DATAMANAGER_CONFIG: {
    SAMPLE_DRIVER: {
      BASE_PATH: 'mock_base',
      HOST: 'mock_host',
      REQUEST_TIMEOUT: 890999,
      DRIVER: 'P4'
    }
  },
  LOGGING_CONFIG: {
    LOG_LEVEL: '' as LoggerLevel,
    API_ENABLED: true,
    API_LOG_LEVEL: LoggerLevel?.error,
    API_FW_LOG_LEVEL: LoggerLevel?.error,
    DATAMANAGER_APP: 'TEST',
    DATAMANAGER_CORE: 'TEST'
  },
  KEEP_ALIVE_CONFIG: {
    REFRESH_TIMER: 100
  },
  MAINTENANCE_CONFIG: {
    TYPE: 'local',
    ENABLED: false,
    CAUSE: MaintenanceCause.all_services_maintenance
  },
  TAG_MANAGER_CONFIG: {
    DRIVERS: [
      {
        DRIVER: 'TXP4',
        CLASS: ['class']
      }
    ]
  }
};

const url = 'https://apps.cdn.int.aws.bancsabadell.com';
// eslint-disable-next-line no-global-assign
window = Object.create(window);
Object.defineProperty(window, 'location', {
  value: {
    origin: url
  },
  writable: true
});

const spyError = jest.fn();
LoggerUtils.prototype.error = spyError;
const spyDebug = jest.fn();
LoggerUtils.prototype.debug = spyDebug;

declare let setJSESSIONID_JBSWL: () => any;

describe('biocatch-util', () => {
  //   window.matchMedia = jest.fn().mockImplementation((query) => {
  //     return {
  //       matches: true,
  //       media: query,
  //       onchange: null,
  //       addEventListener: jest.fn(),
  //       removeEventListener: jest.fn(),
  //       dispatchEvent: jest.fn()
  //     };
  //   });

  let appendChildSpy: MockInstance<any>;

  beforeEach(() => {
    const setJSESSIONIDJBSWLSpy = jest.fn();
    setJSESSIONID_JBSWL = setJSESSIONIDJBSWLSpy;
    appendChildSpy = jest.spyOn(document.head!, 'appendChild');
    appendChildSpy.mockImplementation((node: Node): Node => {
      console.log('[DEBUGGER] appendChildSpy');
      //@ts-ignore not null under this testing cases
      (node as HTMLScriptElement).onload();
      return node;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (global as any).bsmbridge = undefined;
    (global as any).webkit = undefined;
    const commonJS = document.querySelector('#commonJS');
    commonJS?.remove();
    const bioCatchIosJS = document.querySelector('#bioCatchIosJS');
    bioCatchIosJS?.remove();
    const bioCatchJS = document.querySelector('#bioCatchJS');
    bioCatchJS?.remove();
    jest.clearAllMocks();
  });

  it('should reject when BioCatch is not activated', async () => {
    mockConfig.FRAUD_CONFIG = {
      RSA: {
        ACTIVATED: false
      },
      BIOCATCH: {
        ACTIVATED: false
      }
    };

    await expect(initializeBioCatch(mockConfig)).rejects.toBeFalsy();
    expect(spyError).toHaveBeenCalledTimes(1);
  });

  it('should reject when BioCatch configuration is missing', async () => {
    mockConfig.FRAUD_CONFIG = undefined;

    await expect(initializeBioCatch(mockConfig)).rejects.toBeFalsy();
    expect(spyError).toHaveBeenCalledTimes(1);
    expect(spyDebug).not.toHaveBeenCalled();
  });

  it('should resolve when BioCatch is activated and configuration is valid and we are in a web scenario', async () => {
    mockConfig.FRAUD_CONFIG = {
      RSA: {
        ACTIVATED: false
      },
      BIOCATCH: {
        ACTIVATED: true
      }
    };
    expect(isNative()).toBeFalsy();
    await expect(initializeBioCatch(mockConfig)).resolves.toBeTruthy();
    expect(spyError).not.toHaveBeenCalled();
    expect(LoggerUtils.getInstance().debug).toHaveBeenCalledTimes(5);
  });

  it('should initialize on an iOS scenario', async () => {
    mockConfig.FRAUD_CONFIG = {
      RSA: {
        ACTIVATED: false
      },
      BIOCATCH: {
        ACTIVATED: true
      }
    };

    (global as any).webkit = { messageHandlers: { initBridge: {} } };
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
      configurable: true
    });

    (global as any).setJSESSIONID_JBSWL = jest.fn().mockReturnValue('0000000');

    await expect(initializeBioCatch(mockConfig)).resolves.toBeTruthy();

    const bioCatchJS = document.querySelector('#bioCatchJS');
    bioCatchJS?.dispatchEvent(new Event('load'));

    expect(spyError).not.toHaveBeenCalled();
    expect(spyDebug).toHaveBeenCalledTimes(8);
  });

  it('should catch the "script-already-included" rejection', async () => {
    mockConfig.FRAUD_CONFIG = {
      RSA: {
        ACTIVATED: false
      },
      BIOCATCH: {
        ACTIVATED: true
      }
    };

    const querySelectorSpy = jest.spyOn(document, 'querySelector');
    querySelectorSpy.mockImplementation((query: string): HTMLElement | null => {
      return (query === '#commonJS') as any;
    });
    const getElementByIdSpy = jest.spyOn(document, 'getElementById');
    getElementByIdSpy.mockImplementation((_elementId: string): HTMLElement | null => {
      return true as any;
    });

    (global as any).setJSESSIONID_JBSWL = jest.fn().mockReturnValue('0000000');

    await expect(initializeBioCatch(mockConfig)).resolves.toBeTruthy();
    expect(spyError).toHaveBeenCalledTimes(1);
    expect(spyDebug).toHaveBeenCalledTimes(4);
  });

  it('should initialize on a BSO scenario', async () => {
    mockConfig.FRAUD_CONFIG = {
      RSA: {
        ACTIVATED: false
      },
      BIOCATCH: {
        ACTIVATED: true
      }
    };

    jest.spyOn(window, 'parent', 'get').mockReturnValue({} as Window);

    expect(isWebContainer()).toBeTruthy();
    await expect(initializeBioCatchBSO(mockConfig)).resolves.toBeTruthy();

    const bioCatchBSOJS = document.querySelector('#jsLean');
    bioCatchBSOJS?.dispatchEvent(new Event('load'));

    expect(spyError).not.toHaveBeenCalled();
    expect(spyDebug).toHaveBeenCalledTimes(2);
  });

  it('should NOT initialize on a BSO scenario because of config', async () => {
    mockConfig.FRAUD_CONFIG = {
      RSA: {
        ACTIVATED: false
      },
      BIOCATCH: {
        ACTIVATED: false
      }
    };

    jest.spyOn(window, 'parent', 'get').mockReturnValue({} as Window);

    expect(isWebContainer()).toBeTruthy();
    await expect(initializeBioCatchBSO(mockConfig)).rejects.toBeFalsy();

    const bioCatchBSOJS = document.querySelector('#jsLean');
    bioCatchBSOJS?.dispatchEvent(new Event('load'));

    expect(spyError).toHaveBeenCalledTimes(1);
    expect(spyDebug).not.toHaveBeenCalled();
  });
});
