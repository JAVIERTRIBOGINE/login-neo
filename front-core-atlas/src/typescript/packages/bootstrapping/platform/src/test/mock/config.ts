import { LoggerLevel } from '@proteo/logger-utils';
import {
  type AvailableDrivers,
  type CoreBrowserConfig,
  MaintenanceCause,
  type InitEventResponsePayload
} from '@proteo/types';

type CustomBrowserType = CoreBrowserConfig & {
  customProp: string;
};
export const mockInitData: InitEventResponsePayload = {
  language: 'es',
  auth: {
    OIDC: 'tokenOIDC',
    OAUTH: 'tokenOAUTH'
  },
  externalData: { variable: 'value' }
};

export const MOCK_CONFIG: CustomBrowserType = {
  APP_CONFIG: {
    NAME: 'mock_shell',
    DEFAULT_LOCALE: 'es',
    VERSION: '0.0.1'
  },
  CONFIG_VERSION: '0.0.1',
  DATAMANAGER_CONFIG: {
    EXTERNAL: {
      HOST: 'https://jsonplaceholder.typicode.com',
      BASE_PATH: '/',
      DRIVER: 'HTTP' as AvailableDrivers
    },
    P4: {
      HOST: 'https://int.api.bancsabadell.com:8443',
      BASE_PATH: '/front',
      DRIVER: 'P4' as AvailableDrivers,
      HAS_CUSTOM_ERROR: true
    },
    ACCOUNTS: {
      HOST: 'https://int.api.bancsabadell.com:8443',
      BASE_PATH: '/front/digital/v1/accounts',
      DRIVER: 'P4' as AvailableDrivers,
      HAS_CUSTOM_ERROR: true
    }
  },
  AUTH_CONFIG: {
    DATA_MANAGER: 'TEST',
    CLIENT_ID: 'CLIENT_ID',
    REDIRECT_URI: '/redirect_uri',
    SCOPES: ['scope.1'],
    AUTH_TYPE: 'EMPLOYEES'
  },
  APP_EVENTS: ['MOCK_EVENT'],
  LOGGING_CONFIG: {
    LOG_LEVEL: '' as LoggerLevel,
    API_ENABLED: true,
    API_ENDPOINT: 'mock_endpoint',
    API_LOG_LEVEL: LoggerLevel.error,
    API_FW_LOG_LEVEL: LoggerLevel.error,
    DATAMANAGER_APP: 'TEST',
    DATAMANAGER_CORE: 'TEST'
  },
  BRIDGE_EVENTS: ['MOCK_EVENT'],
  MICROFRONTEND_METADATA: [],
  customProp: 'shell_prop',
  MAINTENANCE_CONFIG: {
    TYPE: 'local',
    ENABLED: false,
    CAUSE: MaintenanceCause.all_services_maintenance
  }
};
