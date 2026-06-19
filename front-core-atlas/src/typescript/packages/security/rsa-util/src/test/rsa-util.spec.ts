import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { MaintenanceCause, type BaseAppConfig } from '@proteo/types';
import { initializeRSA } from '../rsa-util';
import { LoggerLevel, LoggerUtils } from '@proteo/logger-utils';
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

declare let updateDeviceTokenCookie: (uuid: string) => any;
declare let add_deviceprint: () => any;

describe('rsa-util', () => {
  let appendChildSpy: MockInstance<any>;

  beforeEach(() => {
    const updateDeviceTokenCookieSpy = jest.fn();
    updateDeviceTokenCookie = updateDeviceTokenCookieSpy;
    const addDeviceprintSpy = jest.fn();
    add_deviceprint = addDeviceprintSpy;
    appendChildSpy = jest.spyOn(document.head!, 'appendChild');
    appendChildSpy.mockImplementation((node: Node): Node => {
      //@ts-ignore not null under this testing cases
      (node as HTMLScriptElement).onload();
      return node;
    });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    const commonJS = document.querySelector('#commonJS');
    commonJS?.remove();
    const rsaJS = document.querySelector('#rsaJS');
    rsaJS?.remove();
    const hashtableJS = document.querySelector('#hashtable');
    hashtableJS?.remove();
    jest.clearAllMocks();
  });

  it('should reject when RSA is deactivated in config', async () => {
    expect.assertions(2);

    mockConfig.FRAUD_CONFIG = {
      RSA: {
        ACTIVATED: false
      },
      BIOCATCH: {
        ACTIVATED: false
      }
    };

    await expect(initializeRSA(mockConfig)).rejects.toBeFalsy();
    expect(spyError).toHaveBeenCalledWith('[RSA Utils] Can not initialize because your config is set to not initialize RSA', {
      remoteLogger: true,
      type: 'application'
    });
  });

  it('should reject when RSA configuration is missing', async () => {
    expect.assertions(2);

    mockConfig.FRAUD_CONFIG = undefined;

    await expect(initializeRSA(mockConfig)).rejects.toBeFalsy();
    expect(spyError).toHaveBeenCalledWith('[RSA Utils] Can not initialize because your config is set to not initialize RSA', {
      remoteLogger: true,
      type: 'application'
    });
  });

  it('should resolve when RSA is activated and configuration is valid', async () => {
    expect.assertions(3);

    mockConfig.FRAUD_CONFIG = {
      RSA: {
        ACTIVATED: true
      },
      BIOCATCH: {
        ACTIVATED: false
      }
    };

    await expect(initializeRSA(mockConfig)).resolves.toBeTruthy();
    expect(spyError).not.toHaveBeenCalled();
    expect(spyDebug).toHaveBeenCalledTimes(6);
  });

  it('should fail the appendElementScript and go through the catch', async () => {
    expect.assertions(3);

    const querySelectorSpy = jest.spyOn(document, 'querySelector');
    querySelectorSpy.mockImplementation((query: string): HTMLElement | null => {
      return (query === '#commonJS') as any;
    });
    const getElementByIdSpy = jest.spyOn(document, 'getElementById');
    getElementByIdSpy.mockImplementation((_elementId: string): HTMLElement | null => {
      return true as any;
    });

    mockConfig.FRAUD_CONFIG = {
      RSA: {
        ACTIVATED: true
      },
      BIOCATCH: {
        ACTIVATED: false
      }
    };
    await expect(initializeRSA(mockConfig)).resolves.toBeTruthy();
    expect(spyError).toHaveBeenCalledTimes(1);
    expect(spyDebug).toHaveBeenCalledTimes(5);
  });
});
