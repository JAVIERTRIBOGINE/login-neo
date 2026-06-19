import { LoggerLevel } from '@proteo/logger-utils';
import { MaintenanceCause, type BaseAppConfig, type LoaderConf } from '@proteo/types';
import type { FetchMock } from 'jest-fetch-mock';
import fetch from 'jest-fetch-mock';
import { ConfigLoader } from '../config-loader.js';

const fetchMock = fetch as unknown as FetchMock;

type CustomData = BaseAppConfig & {
  extraDefaultData: string;
  extraConfigData_1: string;
  extraConfigData_2: string;
};

const MockBaseData: BaseAppConfig = {
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
    LOG_LEVEL: 'debug' as LoggerLevel,
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

fetchMock.enableMocks();

describe('Config Loader', () => {
  let defaultConfig: unknown;
  beforeEach(() => {
    fetchMock.resetMocks();
    defaultConfig = {
      ...MockBaseData,
      ...{
        extraDefaultData: 'CUSTOM_APP_CONFIG'
      }
    };
    ConfigLoader.clearCache();
  });

  it('When no config is provided, it should load the default file with its value', async () => {
    expect.assertions(5);
    fetchMock.mockResponse(JSON.stringify(defaultConfig));
    const resp = await ConfigLoader.retrieveAllGlobalConfig<CustomData>();
    expect(resp.extraDefaultData).toEqual('CUSTOM_APP_CONFIG');
    expect(resp.APP_CONFIG.NAME).toEqual('mock_app');
    expect(fetchMock.mock.calls.length).toEqual(2);
    expect(fetchMock.mock.calls[0][0]).toEqual('conf/env.json');
    expect(fetchMock.mock.calls[1][0]).toEqual('conf/runtime.json');
  });

  it('When config files are provided, it should load and merge all the config files', async () => {
    expect.assertions(9);

    const config: LoaderConf = {
      CONFIG_FILE_NAMES: ['config_1.json', 'config_2.json']
    };
    const dataConfig_1 = {
      extraConfigData_1: 'CUSTOM_CONFIG_DATA_1'
    };
    const dataConfig_2 = {
      extraConfigData_2: 'CUSTOM_CONFIG_DATA_2'
    };

    fetchMock.mockResponses(
      [JSON.stringify(dataConfig_1), { status: 200 }],
      [JSON.stringify(dataConfig_2), { status: 200 }],
      [JSON.stringify(defaultConfig), { status: 200 }],
      [JSON.stringify([]), { status: 200 }]
    );
    const resp = await ConfigLoader.retrieveAllGlobalConfig<CustomData>(config);
    expect(resp.extraDefaultData).toEqual('CUSTOM_APP_CONFIG');
    expect(resp.extraConfigData_1).toEqual('CUSTOM_CONFIG_DATA_1');
    expect(resp.extraConfigData_2).toEqual('CUSTOM_CONFIG_DATA_2');
    expect(resp.APP_CONFIG.NAME).toEqual('mock_app');
    expect(fetchMock.mock.calls.length).toEqual(4);
    expect(fetchMock.mock.calls[0][0]).toEqual(`conf/${config.CONFIG_FILE_NAMES?.[0]}`);
    expect(fetchMock.mock.calls[1][0]).toEqual(`conf/${config.CONFIG_FILE_NAMES?.[1]}`);
    expect(fetchMock.mock.calls[2][0]).toEqual('conf/env.json');
    expect(fetchMock.mock.calls[3][0]).toEqual('conf/runtime.json');
  });

  it('When custom host and base path are provided, it should load the config from that URL', async () => {
    expect.assertions(5);
    const config: LoaderConf = {
      HOST: 'http://customhost',
      CONFIG_BASE_PATH: '/custom_path/'
    };
    fetchMock.mockResponse(JSON.stringify(defaultConfig));
    const resp = await ConfigLoader.retrieveAllGlobalConfig<CustomData>(config);
    expect(resp.extraDefaultData).toEqual('CUSTOM_APP_CONFIG');
    expect(resp.APP_CONFIG.NAME).toEqual('mock_app');
    expect(fetchMock.mock.calls.length).toEqual(2);
    expect(fetchMock.mock.calls[0][0]).toEqual(`${config.HOST}${config.CONFIG_BASE_PATH}env.json`);
    expect(fetchMock.mock.calls[1][0]).toEqual(`${config.HOST}${config.CONFIG_BASE_PATH}runtime.json`);
  });

  it('When some of the config files returns an error, it should load all the ok config responses', async () => {
    expect.assertions(8);
    const config: LoaderConf = {
      CONFIG_FILE_NAMES: ['config_1.json', 'config_2.json']
    };
    const dataConfig_1 = {
      extraConfigData_1: 'CUSTOM_CONFIG_DATA_1'
    };
    const dataConfig_2 = {
      extraConfigData_2: 'CUSTOM_CONFIG_DATA_2'
    };
    fetchMock.mockResponses(
      [JSON.stringify(defaultConfig), { status: 200 }],
      [JSON.stringify(dataConfig_1), { status: 200 }],
      [JSON.stringify(dataConfig_2), { status: 404 }],
      [JSON.stringify([]), { status: 200 }]
    );

    const resp = await ConfigLoader.retrieveAllGlobalConfig<CustomData>(config);
    expect(resp.extraDefaultData).toEqual('CUSTOM_APP_CONFIG');
    expect(resp.extraConfigData_1).toEqual('CUSTOM_CONFIG_DATA_1');
    expect(resp.extraConfigData_2).toBeUndefined();
    expect(fetchMock.mock.calls.length).toEqual(4);
    expect(fetchMock.mock.calls[0][0]).toEqual(`conf/${config.CONFIG_FILE_NAMES?.[0]}`);
    expect(fetchMock.mock.calls[1][0]).toEqual(`conf/${config.CONFIG_FILE_NAMES?.[1]}`);
    expect(fetchMock.mock.calls[2][0]).toEqual('conf/env.json');
    expect(fetchMock.mock.calls[3][0]).toEqual('conf/runtime.json');
  });
});
