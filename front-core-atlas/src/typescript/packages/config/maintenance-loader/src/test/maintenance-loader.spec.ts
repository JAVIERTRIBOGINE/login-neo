import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { I18n } from '@proteo/i18n-utils';
import { LoggerLevel } from '@proteo/logger-utils';
import { isNative } from '@proteo/platform-utils';
import { MaintenanceCause, type CoreAppConfig } from '@proteo/types';
import fetch from 'jest-fetch-mock';
import { checkMaintenanceConfig } from '../maintenance-loader.js';
import type { FetchMock } from 'jest-fetch-mock';

const fetchMock = fetch as unknown as FetchMock;

const locales = {};
fetchMock.mockResponse(JSON.stringify(locales));

const ExternalConfigData: CoreAppConfig = {
  APP_EVENTS: [],
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
    API_LOG_LEVEL: LoggerLevel.debug,
    API_FW_LOG_LEVEL: LoggerLevel.error,
    DATAMANAGER_APP: 'TEST',
    DATAMANAGER_CORE: 'TEST'
  },
  MAINTENANCE_CONFIG: {
    TYPE: 'local',
    ENABLED: false,
    CAUSE: MaintenanceCause.all_services_maintenance,
    URL: ''
  }
};

describe('Maintenance Loader', () => {
  let i18n: I18n;
  const lang = 'ca_ES';
  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        assign: jest.fn(),
        origin: 'https://apps.cdn.aws.bancsabadell.com'
      }
    });
  });
  beforeEach(async () => {
    await I18n.initInstance();
    i18n = new I18n();
    await i18n.use(lang);
  });

  it('When MAINTENANCE_CONFIG.ENABLED is false it should return an empty string', () => {
    expect.assertions(1);
    checkMaintenanceConfig(ExternalConfigData);
    expect(window.location.assign).toHaveBeenCalledTimes(0);
  });

  it('When MAINTENANCE_CONFIG.ENABLED is true it should return the path where is going to navigate', () => {
    expect.assertions(2);
    const data = ExternalConfigData;
    data.MAINTENANCE_CONFIG.ENABLED = true;
    checkMaintenanceConfig(data);
    const url = '/app/maintenance/v0/?isMobile=' + isNative() + '&lang=' + lang + '&cause=' + data.MAINTENANCE_CONFIG.CAUSE;
    expect(window.location.assign).toHaveBeenCalledTimes(1);
    expect(window.location.assign).toHaveBeenCalledWith(url);
  });
});
