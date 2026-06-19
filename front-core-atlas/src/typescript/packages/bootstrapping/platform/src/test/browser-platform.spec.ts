/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { authorize, getTokens } from '@proteo/authorization-utils';
import { ConfigLoader } from '@proteo/config-loader';
import { clearTokens as clearTokensDataManager, setAuthorization } from '@proteo/data-manager';
import { EventManager } from '@proteo/event-bus';
import { I18n, I18nLangLoader } from '@proteo/i18n-utils';
import { KeepAlive } from '@proteo/keep-alive';
import { EVENT_PROTEO_LOGGER_LOG, LoggerUtils } from '@proteo/logger-utils';
import { clearTokens as clearTokenRefreshUtil } from '@proteo/refresh-tokens-utils';
import { ResizeUtils } from '@proteo/resize-utils';
import { TagManager } from '@proteo/tag-manager';
import {
  type AuthorizationTokens,
  type AuthorizeRequest,
  type AuthorizeResponse,
  type BsEventBusCallback,
  type CoreBrowserConfig,
  type DataManagerResponse,
  type InitEventResponsePayload,
  type LoggerCustomEvent,
  type TokensRequest,
  type TokensResponse
} from '@proteo/types';
import type { FetchMock } from 'jest-fetch-mock';
import fetch from 'jest-fetch-mock';
import { MOCK_CONFIG } from './mock/config';

const fetchMock = fetch as unknown as FetchMock;
fetchMock.enableMocks();

const mockConfig = MOCK_CONFIG;

type CustomBrowserType = CoreBrowserConfig & {
  customProp: string;
};

// Array para almacenar los listeners
const listeners: Array<{ type: string; listener: EventListener }> = [];

// Proxy para window.addEventListener
const originalAddEventListener = window.addEventListener;
(window.addEventListener as any) = function (
  type: string,
  listener: EventListener,
  options?: boolean | AddEventListenerOptions
) {
  listeners.push({ type, listener });
  originalAddEventListener.call(window, type, listener, options);
};

// Proxy para window.removeEventListener
const originalRemoveEventListener = window.removeEventListener;
(window.removeEventListener as any) = function (
  type: string,
  listener: EventListener,
  options?: boolean | EventListenerOptions
) {
  const index = listeners.findIndex((l) => l.type === type && l.listener === listener);
  if (index !== -1) {
    listeners.splice(index, 1);
  }
  originalRemoveEventListener.call(window, type, listener, options);
};

// Función para eliminar todos los listeners
function removeAllWindowEventListeners() {
  listeners.forEach(({ type, listener }) => {
    originalRemoveEventListener.call(window, type, listener);
  });
  listeners.length = 0; // Vaciar el array
}

jest.unstable_mockModule('@proteo/platform-utils', () => ({
  isFullProteo: jest.fn().mockReturnValue(false),
  isNative: jest.fn().mockReturnValue(false),
  getChannel: jest.fn().mockReturnValue('full-proteo'),
  isWebContainer: jest.fn().mockReturnValue(false)
}));

let mockInitData: InitEventResponsePayload = {
  language: 'es',
  auth: {
    OIDC: 'tokenOIDC',
    OAUTH: 'tokenOAUTH'
  },
  externalData: { variable: 'value' },
  analytics: {}
};
let subscribeCallback: BsEventBusCallback;

jest.unstable_mockModule('@proteo/bootstrap', () => {
  return {
    CoreBootstrap: {
      initialize: jest.fn()
    },
    BridgeBootstrap: {
      initialize: jest.fn()
    }
  };
});

const mockIsAuthInitialized = jest.fn().mockReturnValue(false);
const mockAuthInitialize = jest.fn();

let authorizeSuccess = true;
const mockAuthorize = jest.fn() as jest.MockedFunction<typeof authorize>;

let getTokensSuccess = true;
const mockGetTokens = jest.fn() as jest.MockedFunction<typeof getTokens>;

const extractUserInfoFromTokenMock = jest.fn();
jest.unstable_mockModule('@proteo/authorization-utils', () => ({
  initialize: mockAuthInitialize,
  authorize: mockAuthorize,
  getTokens: mockGetTokens,
  isAuthInitialized: mockIsAuthInitialized,
  DEFAULT_REDIRECT_URI: '[YOUR_REDIRECT_URI]',
  DEFAULT_CLIENT_ID: '[YOUR_CLIENT_ID]',
  extractUserInfoFromToken: extractUserInfoFromTokenMock
}));

const mockSetAuthorization = jest.fn() as jest.MockedFunction<typeof setAuthorization>;
const mockGetDriver = jest.fn().mockImplementation(() => ({
  setAuthorization: mockSetAuthorization
}));
const mockClearTokensDataManager = jest.fn() as jest.MockedFunction<typeof clearTokensDataManager>;
jest.unstable_mockModule('@proteo/data-manager', () => ({
  setAuthorization: mockSetAuthorization,
  getDriver: mockGetDriver,
  clearTokens: mockClearTokensDataManager
}));

const mockClearTokensRefreshUtil = jest.fn() as jest.MockedFunction<typeof clearTokenRefreshUtil>;
jest.unstable_mockModule('@proteo/refresh-tokens-utils', () => ({
  clearTokens: mockClearTokensRefreshUtil
}));

const mockLog = jest.fn();
jest.unstable_mockModule('@proteo/remote-logger-utils', () => ({
  log: mockLog
}));

const mockPublish = jest.fn();
const mockKeepAlive = jest.fn();
let mockEventManagerGetInstance: jest.MockedFunction<typeof EventManager.getInstance>;
let mockResizeUtilsGetInstance: jest.MockedFunction<typeof ResizeUtils.getInstance>;
let mockLoggerUtilsGetInstance: jest.MockedFunction<typeof LoggerUtils.getInstance>;
const mockError = jest.fn();

const setNumPersonaMock = jest.fn();

const setUp = () => {
  ConfigLoader.retrieveAllGlobalConfig = jest
    .fn()
    .mockImplementation(() => Promise.resolve(mockConfig)) as jest.MockedFunction<
    typeof ConfigLoader.retrieveAllGlobalConfig
  >;

  mockEventManagerGetInstance = jest.fn().mockImplementation(() => ({
    publishWithResponse: jest.fn().mockImplementation(() => Promise.resolve(mockInitData)),
    subscribeAndPublish: jest.fn(),
    publish: mockPublish,
    subscribe: jest
      .fn()
      .mockImplementation((_eventName, callback) => (subscribeCallback = callback as BsEventBusCallback)),
    subscribeForResponse: jest
      .fn()
      .mockImplementation((_eventName, process) => (subscribeCallback = process as BsEventBusCallback))
  })) as jest.MockedFunction<typeof EventManager.getInstance>;
  EventManager.getInstance = mockEventManagerGetInstance;

  TagManager.storeBSMAnalyticsData = jest.fn();
  TagManager.getInstance = jest.fn().mockImplementation(() => ({
    setNumPersona: setNumPersonaMock
  })) as jest.MockedFunction<typeof TagManager.getInstance>;

  KeepAlive.getInstance = jest.fn().mockImplementation(() => ({
    keepAlive: mockKeepAlive
  })) as jest.MockedFunction<typeof KeepAlive.getInstance>;

  mockLoggerUtilsGetInstance = jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    error: mockError
  })) as jest.MockedFunction<typeof LoggerUtils.getInstance>;
  LoggerUtils.getInstance = mockLoggerUtilsGetInstance;

  I18nLangLoader.prototype.loadLocale = jest.fn().mockReturnValue('ca') as jest.MockedFunction<
    typeof I18nLangLoader.prototype.loadLocale
  >;

  I18n.initInstance = jest.fn().mockReturnValue({
    initInstance: jest.fn(),
    getInstance: jest.fn().mockReturnValue({
      language: 'es',
      use: jest.fn()
    })
  }) as jest.MockedFunction<typeof I18n.initInstance>;

  I18n.getInstance = jest.fn().mockReturnValue({
    use: jest.fn()
  }) as jest.MockedFunction<typeof I18n.getInstance>;

  mockResizeUtilsGetInstance = jest.fn().mockReturnValue({ initObserve: jest.fn() }) as jest.MockedFunction<
    typeof ResizeUtils.getInstance
  >;
  ResizeUtils.getInstance = mockResizeUtilsGetInstance;

  mockAuthorize.mockImplementation((_request: AuthorizeRequest) => {
    if (authorizeSuccess) {
      return Promise.resolve({
        status: 200,
        data: { location: 'https://my-url.com/page?code=code&state=state' },
        url: 'https://my-url.com/page'
      } as DataManagerResponse<AuthorizeResponse>);
    }
    return Promise.reject({ status: 400, data: 'Authorize error' });
  });

  mockGetTokens.mockImplementation((_request: TokensRequest) => {
    if (getTokensSuccess) {
      return Promise.resolve({
        status: 200,
        data: {
          access_token: 'access_token',
          id_token: 'id_token',
          expires_in: '10'
        }
      } as DataManagerResponse<TokensResponse>);
    }
    return Promise.reject({ status: 400, data: 'Get Tokens error' });
  });
};

describe('browser-platform', () => {
  let browserPlatform: any;

  beforeEach(async () => {
    const { BrowserPlatform } = await import('../browser-platform');
    setUp();
    browserPlatform = new BrowserPlatform<CustomBrowserType>(
      EventManager.getInstance(),
      ResizeUtils.getInstance(),
      LoggerUtils.getInstance()
    );
    window.BsDataManager = {
      driversMap: new Map<string, any>(),
      pendingConfigsMap: new Map<string, any>()
    };
  });

  afterEach(() => {
    removeAllWindowEventListeners();
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  it('should instance utilities at constructor if not provided', async () => {
    const { BrowserPlatform } = await import('../browser-platform');
    browserPlatform = new BrowserPlatform<CustomBrowserType>();
    expect(mockEventManagerGetInstance).toHaveBeenCalled();
    expect(mockResizeUtilsGetInstance).toHaveBeenCalled();
    expect(mockLoggerUtilsGetInstance).toHaveBeenCalled();
  });

  it('should return the extended configuration', async () => {
    const config = await browserPlatform.bootstrap();
    const configDirect = await ConfigLoader.retrieveAllGlobalConfig();
    expect(configDirect).toEqual(mockConfig);
    expect(config.APP_CONFIG.NAME).toEqual('mock_shell');
    expect(config.BRIDGE_EVENTS[0]).toEqual('MOCK_EVENT');
    expect(config.customProp).toEqual('shell_prop');

    expect(config.INIT_DATA?.auth?.OAUTH).toEqual('tokenOAUTH');

    const externalData = config.INIT_DATA?.externalData as any;
    expect(externalData.variable).toEqual('value');
  });

  it('should print a message when no tokens are passed', async () => {
    mockInitData = { language: 'ca' };

    const config = await browserPlatform.bootstrap();
    expect(config.INIT_DATA).toEqual(mockInitData);
  });

  it('should update tokens when refresh tokens event is received', async () => {
    const { isFullProteo } = await import('@proteo/platform-utils');
    (isFullProteo as jest.Mock).mockReturnValue(false);
    const initParameters = { mock: 'value' };
    mockInitData = { language: 'ca', initParameters: initParameters };

    await browserPlatform.bootstrap();

    const tokens: AuthorizationTokens = { OAUTH: 'token', OIDC: 'token' };
    subscribeCallback('REFRESH_TOKENS', tokens);

    expect(mockSetAuthorization).toHaveBeenCalledTimes(1);
    expect(mockSetAuthorization).toHaveBeenCalledWith(tokens);
  });

  it('should clear stored tokens', async () => {
    browserPlatform.clearTokens();
    expect(mockClearTokensRefreshUtil).toHaveBeenCalled();
    expect(mockClearTokensDataManager).toHaveBeenCalled();
  });

  it('should return mock data on full proteo4 scenario', async () => {
    const { isFullProteo } = await import('@proteo/platform-utils');
    (isFullProteo as jest.Mock).mockReturnValue(true);

    const config = await browserPlatform.bootstrap();
    expect(config.INIT_DATA?.externalData).toBeUndefined();
  });

  it('should return initParameters into externalData on native platform', async () => {
    const { isFullProteo } = await import('@proteo/platform-utils');
    (isFullProteo as jest.Mock).mockReturnValue(false);

    const initParameters = { mock: 'value' };
    mockInitData = { language: 'ca', initParameters: initParameters };

    const config = await browserPlatform.bootstrap();
    expect(config.INIT_DATA?.externalData).toEqual(initParameters);
  });

  it('should recover numpersona from userInfo and set it into TagManager', async () => {
    mockInitData = { language: 'ca', userInfo: 'properJWTToken' };
    extractUserInfoFromTokenMock.mockReturnValueOnce({
      numpersona: 'mockNumPersona'
    });
    await browserPlatform.bootstrap();
    expect(extractUserInfoFromTokenMock).toHaveBeenCalledWith('properJWTToken');
    expect(setNumPersonaMock).toHaveBeenCalledWith('mockNumPersona');
  });

  it('should manage userInfo token error parse', async () => {
    mockInitData = { language: 'ca', userInfo: 'wrongJWTToken' };
    extractUserInfoFromTokenMock.mockImplementationOnce(() => {
      throw new Error();
    });
    await browserPlatform.bootstrap();
    expect(extractUserInfoFromTokenMock).toHaveBeenCalledWith('wrongJWTToken');
    expect(mockError).toHaveBeenCalledWith('[BrowserPlatform] bootstrap: User info parse error: Error', {
      remoteLogger: true,
      type: 'application'
    });
    expect(setNumPersonaMock).not.toHaveBeenCalled();
  });

  it('should log when EVENT_PROTEO_LOGGER_LOG event is received if API_ENABLED config is set', async () => {
    mockInitData = { language: 'ca' };
    await browserPlatform.bootstrap();
    const mockDetail: LoggerCustomEvent = {
      message: 'message',
      meta: [],
      level: 'level'
    };
    window.dispatchEvent(new CustomEvent<LoggerCustomEvent>(EVENT_PROTEO_LOGGER_LOG, { detail: mockDetail }));
    expect(mockLog).toHaveBeenCalledTimes(1);
  });

  it('should not log when EVENT_PROTEO_LOGGER_LOG event is received if API_ENABLED config is not set', async () => {
    (mockConfig.LOGGING_CONFIG as any).API_ENABLED = false;
    await browserPlatform.bootstrap();
    const mockDetail: LoggerCustomEvent = {
      message: 'message',
      meta: [],
      level: 'level'
    };
    window.dispatchEvent(new CustomEvent<LoggerCustomEvent>(EVENT_PROTEO_LOGGER_LOG, { detail: mockDetail }));
    expect(mockLog).toHaveBeenCalledTimes(0);
  });

  describe('Refresh tokens', () => {
    beforeEach(async () => {
      const { isFullProteo } = await import('@proteo/platform-utils');
      (isFullProteo as jest.Mock).mockReturnValue(true);
      authorizeSuccess = true;
      getTokensSuccess = true;
    });

    it('should execute the function that fires when the token expired message is received', async () => {
      expect.assertions(1);
      await browserPlatform.bootstrap();
      subscribeCallback('REQUEST_REFRESH_TOKENS.MY-APP', {});
      expect(mockIsAuthInitialized).toHaveBeenCalled();
    });

    it('should return an error when auth is not initialized and no auth config is set', async () => {
      expect.assertions(1);
      delete mockConfig.AUTH_CONFIG;
      const config = await browserPlatform.bootstrap();
      const result = await browserPlatform.refreshTokensFunction(config);
      expect(result).toStrictEqual({ error: 'Auth config is missing' });
    });

    it('should return an error when auth is not initialized and no redirect URI is set', async () => {
      expect.assertions(1);
      mockConfig.AUTH_CONFIG = {
        DATA_MANAGER: 'TEST',
        CLIENT_ID: '[YOUR_CLIENT_ID]',
        REDIRECT_URI: '[YOUR_REDIRECT_URI]',
        SCOPES: ['scope.1'],
        AUTH_TYPE: 'EMPLOYEES'
      };
      const config = await browserPlatform.bootstrap();
      const result = await browserPlatform.refreshTokensFunction(config);
      expect(result).toStrictEqual({ error: 'Redirect URI not set' });
    });

    it('should return an error when auth is not initialized and no clientID is set', async () => {
      expect.assertions(1);
      (mockConfig.AUTH_CONFIG as any).REDIRECT_URI = '/redirect-uri';
      const config = await browserPlatform.bootstrap();
      const result = await browserPlatform.refreshTokensFunction(config);
      expect(result).toStrictEqual({ error: 'Client ID not set' });
    });

    it('should call auth initialize if auth is not initialized and proper auth config is set', async () => {
      expect.assertions(1);
      (mockConfig.AUTH_CONFIG as any).CLIENT_ID = 'CLIENT_ID';
      const config = await browserPlatform.bootstrap();
      await browserPlatform.refreshTokensFunction(config);
      expect(mockAuthInitialize).toHaveBeenCalled();
    });

    it('should return the stored tokens because they are not invalidated yet when auth is initialized', async () => {
      expect.assertions(1);
      mockIsAuthInitialized.mockReturnValue(true);
      const config = await browserPlatform.bootstrap();
      ((browserPlatform.storedTokens = {
        OIDC: 'storedTokenOIDC',
        OAUTH: 'storedTokenOAUTH'
      }),
        (browserPlatform['lastRefreshTimestamp'] = 10));
      browserPlatform['tokensExpiration'] = 100000000000000000;
      const result = await browserPlatform.refreshTokensFunction(config);
      expect(result).toStrictEqual({
        OIDC: 'storedTokenOIDC',
        OAUTH: 'storedTokenOAUTH'
      });
    });

    it('should return an error when auth is initialized but authorize fails', async () => {
      expect.assertions(3);
      mockIsAuthInitialized.mockReturnValue(true);
      authorizeSuccess = false;
      window.BsAuthorizationConfig = {
        clientID: 'clientID',
        type: 'EMPLOYEES',
        url: {
          authenticate: '',
          authorize: '',
          token: ''
        },
        dataManager: 'dataManager',
        redirectUri: '/redirect-uri'
      };
      const config = await browserPlatform.bootstrap();
      browserPlatform['lastRefreshTimestamp'] = 10;
      browserPlatform['tokensExpiration'] = 10;
      const result = await browserPlatform.refreshTokensFunction(config);
      expect(mockPublish).toHaveBeenCalledTimes(1);
      expect(mockPublish).toHaveBeenCalledWith('AUTH_ERROR', { status: 400, data: 'Authorize error' });
      expect(result).toStrictEqual({ error: 'AUTH_ERROR' });
    });

    it('should return an error when auth is initialized, authorize works but getTokens fails', async () => {
      expect.assertions(3);
      mockIsAuthInitialized.mockReturnValue(true);
      getTokensSuccess = false;
      window.BsAuthorizationConfig = {
        clientID: 'clientID',
        type: 'EMPLOYEES',
        url: {
          authenticate: '',
          authorize: '',
          token: ''
        },
        dataManager: 'dataManager',
        redirectUri: '/redirect-uri'
      };
      const config = await browserPlatform.bootstrap();
      browserPlatform['lastRefreshTimestamp'] = 10;
      browserPlatform['tokensExpiration'] = 10;
      const result = await browserPlatform.refreshTokensFunction(config);
      expect(mockPublish).toHaveBeenCalledTimes(1);
      expect(mockPublish).toHaveBeenCalledWith('AUTH_ERROR', { status: 400, data: 'Get Tokens error' });
      expect(result).toStrictEqual({ error: 'AUTH_ERROR' });
    });

    it('should compose a proper tokens result if everything works fine', async () => {
      expect.assertions(2);
      mockIsAuthInitialized.mockReturnValue(true);
      window.BsAuthorizationConfig = {
        clientID: 'clientID',
        type: 'CUSTOMER',
        url: {
          authenticate: '',
          authorize: '',
          token: ''
        },
        dataManager: 'dataManager',
        redirectUri: '/redirect-uri'
      };
      const config = await browserPlatform.bootstrap();
      browserPlatform['lastRefreshTimestamp'] = 10;
      browserPlatform['tokensExpiration'] = 10;
      const result = await browserPlatform.refreshTokensFunction(config);
      expect(mockPublish).not.toHaveBeenCalled();
      expect(result).toStrictEqual({ OAUTH: 'access_token', OIDC: 'id_token' });
    });

    it('should not send an event if there is no data in getTokens response', async () => {
      expect.assertions(1);
      mockIsAuthInitialized.mockReturnValue(true);
      mockGetTokens.mockReturnValueOnce(Promise.resolve({ status: 200 } as DataManagerResponse<TokensResponse>));
      window.BsAuthorizationConfig = {
        clientID: 'clientID',
        type: 'EMPLOYEES',
        url: {
          authenticate: '',
          authorize: '',
          token: ''
        },
        dataManager: 'dataManager',
        redirectUri: '/redirect-uri'
      };
      const config = await browserPlatform.bootstrap();
      browserPlatform['lastRefreshTimestamp'] = 10;
      browserPlatform['tokensExpiration'] = 10;
      await browserPlatform.refreshTokensFunction(config);
      expect(mockPublish).toHaveBeenCalledTimes(0);
    });
  });

  describe('Keep Alive', () => {
    it('should call KeepAlive on user click', async () => {
      await browserPlatform.bootstrap();
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      window.dispatchEvent(clickEvent);
      expect(mockKeepAlive).toHaveBeenCalledTimes(1);
    });

    it('should call KeepAlive on key press', async () => {
      await browserPlatform.bootstrap();
      const keyEvent = new KeyboardEvent('keydown', {
        key: 'a',
        bubbles: true,
        cancelable: true,
        view: window
      });
      window.dispatchEvent(keyEvent);
      expect(mockKeepAlive).toHaveBeenCalledTimes(1);
    });

    it('should call KeepAlive on drag', async () => {
      await browserPlatform.bootstrap();
      const dragEvent = new Event('dragstart', {
        bubbles: true,
        cancelable: true,
        view: window
      } as any);
      window.dispatchEvent(dragEvent);
      expect(mockKeepAlive).toHaveBeenCalledTimes(1);
    });
  });
});
