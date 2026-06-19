import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LoggerLevel } from '@proteo/logger-utils';
import { BrowserPlatform } from '@proteo/platform';
import { NgProteoBootstrapConfig } from '../models/proteo-bootstrap.model';
import { provideProteoBootstrap } from '../provider-proteo-bootstrap';
import { PROTEO_APP_CONF } from '../tokens';
import { MaintenanceCause, type BaseAppConfig } from '@proteo/types';

type MainAppConfig = BaseAppConfig & NgProteoBootstrapConfig & {
  customAppValue: string;
};

const MockConfig: MainAppConfig = {
  APP_CONFIG: {
    NAME: 'mock_app',
    DEFAULT_LOCALE: 'es',
    VERSION: '0.0.1'
  },
  DATAMANAGER_CONFIG: {
    DEFAULT: {
      HOST: '',
      BASE_PATH: '',
      DRIVER: 'P4'
    }
  },
  CONFIG_VERSION: '0.0.1',
  LOGGING_CONFIG: {
    LOG_LEVEL: LoggerLevel.debug,
    API_FW_LOG_LEVEL: LoggerLevel.debug,
    API_LOG_LEVEL: LoggerLevel.debug,
    API_ENABLED: true,
    API_ENDPOINT: 'mock_endpoint'
  },
  APP_EVENTS: [],
  customAppValue: 'ADDING_APP_CONFIG',
  TAG_MANAGER_CONFIG: {
    DRIVERS: []
  },
  MAINTENANCE_CONFIG: {
    TYPE: 'local',
    ENABLED: true,
    CAUSE: MaintenanceCause.all_services_down,
    URL: null,
    ROUTES: []
  },
  BRIDGE_EVENTS: [],
  MICROFRONTEND_METADATA: []
};

class ResizeObserver {
  observe() {void 0}
  unobserve() { void 0}
  disconnect() { void 0}
}
global.ResizeObserver = ResizeObserver;

describe('provideProteoBootstrap', () => {
  let proteoAppConf: MainAppConfig;

  beforeEach(async () => {
    jest.spyOn(BrowserPlatform.prototype, 'bootstrap').mockReturnValue(Promise.resolve(MockConfig));

    TestBed.configureTestingModule({
      providers: [
        provideProteoBootstrap<NgProteoBootstrapConfig>({
          staticRoutes: []
        })
      ]
    });

    await TestBed.inject(ApplicationInitStatus).donePromise;
    proteoAppConf = TestBed.inject<MainAppConfig>(PROTEO_APP_CONF);
  });

  it('when loader retrieves the info ok, it should provide the configuration thought PROTEO_APP_CONF injection tokens', () => {
    expect(proteoAppConf.customAppValue).toEqual('ADDING_APP_CONFIG');
    expect(proteoAppConf.APP_CONFIG.NAME).toEqual(MockConfig.APP_CONFIG.NAME);
  });
});
