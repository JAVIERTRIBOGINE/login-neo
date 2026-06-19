import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BridgeAndroid } from '@proteo/bridge-bsm-android';
import { BridgeIos } from '@proteo/bridge-bsm-ios';
import { BridgeWeb } from '@proteo/bridge-web';
import { BridgeWebEE } from '@proteo/bridge-web-ee';
import { LoggerLevel } from '@proteo/logger-utils';
import { MaintenanceCause, type CoreShellConfig } from '@proteo/types';

const mockIOS = jest.fn().mockReturnValue(false),
  mockAndroid = jest.fn().mockReturnValue(false),
  mockWeb = jest.fn().mockReturnValue(false),
  mockJxBrowser = jest.fn().mockReturnValue(false),
  mockNative = jest.fn().mockReturnValue(false),
  mockWebContainer = jest.fn().mockReturnValue(false),
  mockEventBus = jest.fn();

jest.unstable_mockModule('@proteo/platform-utils', () => ({
  isIOS: mockIOS,
  isAndroid: mockAndroid,
  isDesktop: mockWeb,
  isJxBrowser: mockJxBrowser,
  isNative: mockNative,
  isWebContainer: mockWebContainer
}));

jest.unstable_mockModule('@proteo/event-bus', () => ({
  EventBus: mockEventBus
}));

const mockConfig: CoreShellConfig = {
  APP_CONFIG: { NAME: '', VERSION: '', DEFAULT_LOCALE: '' },
  LOGGING_CONFIG: {
    API_ENABLED: false,
    API_ENDPOINT: '',
    LOG_LEVEL: LoggerLevel.debug,
    API_FW_LOG_LEVEL: LoggerLevel.debug,
    API_LOG_LEVEL: LoggerLevel.debug
  },
  CONFIG_VERSION: '',
  DATAMANAGER_CONFIG: {
    SAMPLE_DRIVER: {
      BASE_PATH: 'mock_base',
      HOST: 'mock_host',
      REQUEST_TIMEOUT: 890999,
      DRIVER: 'P4'
    }
  },
  BRIDGE_EVENTS: ['Mock'],
  BRIDGE_BROADCAST_EVENTS: ['MockReverse'],
  MICROFRONTEND_METADATA: [],
  MAINTENANCE_CONFIG: {
    TYPE: 'local',
    ENABLED: false,
    CAUSE: MaintenanceCause.all_services_maintenance
  }
};

describe('initialize', () => {
  let platformUtilsImport: any;
  let eventBusImport: any;
  let bridgeBootstrapImport: any;

  let BridgeBootstrap: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    window.BsBridge = undefined as any;
    platformUtilsImport = await import('@proteo/platform-utils');
    eventBusImport = await import('@proteo/event-bus');
    bridgeBootstrapImport = await import('../bridge-bootstrap');

    BridgeBootstrap = bridgeBootstrapImport.BridgeBootstrap;
  });

  it('should create mocks', () => {
    expect(platformUtilsImport).toBeDefined();
    expect(eventBusImport).toBeDefined();
    expect(bridgeBootstrapImport).toBeDefined();
  });

  it('should create a proteo4 event bus', () => {
    expect.assertions(1);
    BridgeBootstrap.initialize(mockConfig);
    expect(mockEventBus).toHaveBeenCalledTimes(1);
  });

  it('should create the proteo4 IOS bridge when we are on IOS platform', async () => {
    expect.assertions(1);
    mockNative.mockReturnValue(true);
    mockIOS.mockReturnValue(true);
    const bridge = await BridgeBootstrap.initialize(mockConfig);
    expect(bridge).toBeInstanceOf(BridgeIos);
  });

  it('should create the proteo4 Android bridge when we are on Android platform', async () => {
    expect.assertions(1);
    mockNative.mockReturnValue(true);
    mockIOS.mockReturnValue(false);
    mockAndroid.mockReturnValue(true);
    const bridge = await BridgeBootstrap.initialize(mockConfig);
    expect(bridge).toBeInstanceOf(BridgeAndroid);
  });

  it('should create the proteo4 Web bridge when we are on Desktop platform', async () => {
    expect.assertions(1);
    mockNative.mockReturnValue(false);
    mockWeb.mockReturnValue(true);
    const bridge = await BridgeBootstrap.initialize(mockConfig);
    expect(bridge).toBeInstanceOf(BridgeWeb);
  });

  it('should create the proteo4 WebEE bridge when we are on JxBrowser platform', async () => {
    expect.assertions(1);
    mockNative.mockReturnValue(false);
    mockJxBrowser.mockReturnValue(true);
    const bridge = await BridgeBootstrap.initialize(mockConfig);
    expect(bridge).toBeInstanceOf(BridgeWebEE);
  });

  it('should create the proteo4 Web bridge when inside an iframe in native application', async () => {
    expect.assertions(1);
    mockWebContainer.mockReturnValue(true);
    mockNative.mockReturnValue(true);
    mockIOS.mockReturnValue(false);
    mockAndroid.mockReturnValue(true);
    const bridge = await BridgeBootstrap.initialize(mockConfig);
    expect(bridge).toBeInstanceOf(BridgeWeb);
  });

  it('should return bridge instance when initializing if already exists', async () => {
    expect.assertions(2);
    const bridge = await BridgeBootstrap.initialize(mockConfig);
    const bridge2 = await BridgeBootstrap.initialize(mockConfig);
    expect(bridge).toEqual(bridge2);
    expect(mockWebContainer).toHaveBeenCalledTimes(1);
  });
});
