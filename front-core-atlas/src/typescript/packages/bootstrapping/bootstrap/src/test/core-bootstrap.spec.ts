import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';
import { AmountUtils } from '@proteo/amount-utils';
import { initializeBioCatch, initializeBioCatchBSO } from '@proteo/biocatch-util';
import { setCookie } from '@proteo/cookie-utils';
import { initializeCookiesPolicy } from '@proteo/cookies-policy-utils';
import { DateUtils } from '@proteo/date-utils';
import { initializeDynatrace } from '@proteo/dynatrace-utils';
import { EventManager } from '@proteo/event-bus';
import { I18n, I18nLangLoader } from '@proteo/i18n-utils';
import { LoggerLevel, LoggerUtils } from '@proteo/logger-utils';
import { initializeRSA } from '@proteo/rsa-util';
import { StorageManager } from '@proteo/storage-utils';
import { TagManager } from '@proteo/tag-manager';
import { TealiumTxDriver } from '@proteo/tag-manager-driver-tealium-tx';
import {
  MaintenanceCause,
  type BsEventBusCallback,
  type BaseAppConfig,
  type ConsentsEventPayload,
  type EventPayload
} from '@proteo/types';

const mockIsFullProteo = jest.fn().mockReturnValue(true);
const mockIsNative = jest.fn();
mockIsNative.mockReturnValue(false);
const mockIOS = jest.fn().mockReturnValue(false);
const mockAndroid = jest.fn().mockReturnValue(false);
const mockWebContainer = jest.fn().mockReturnValue(false);
jest.unstable_mockModule('@proteo/platform-utils', () => ({
  isFullProteo: mockIsFullProteo,
  isNative: mockIsNative,
  isIOS: mockIOS,
  isAndroid: mockAndroid,
  isWebContainer: mockWebContainer
}));

const extractUserInfoFromTokenMock = jest.fn();
jest.unstable_mockModule('@proteo/authorization-utils', () => ({
  extractUserInfoFromToken: extractUserInfoFromTokenMock
}));

const mockConfig: BaseAppConfig = {
  APP_CONFIG: {
    NAME: 'mock_app',
    DEFAULT_LOCALE: 'es',
    VERSION: '0.0.1'
  },
  DATAMANAGER_CONFIG: {
    SAMPLE_DRIVER: {
      BASE_PATH: 'mock_base',
      HOST: 'mock_host',
      REQUEST_TIMEOUT: 890999,
      DRIVER: 'P4'
    }
  },
  TAG_MANAGER_CONFIG: {
    DRIVERS: [
      {
        DRIVER: 'TX',
        CLASS: ['class']
      },
      {
        DRIVER: 'TXP4'
      }
    ]
  },
  CONFIG_VERSION: '0.0.1',
  LOGGING_CONFIG: {
    LOG_LEVEL: '' as LoggerLevel,
    API_ENABLED: true,
    API_ENDPOINT: 'mock_endpoint',
    API_LOG_LEVEL: LoggerLevel.error,
    API_FW_LOG_LEVEL: LoggerLevel.error
  },
  KEEP_ALIVE_CONFIG: {
    REFRESH_TIMER: 100
  },
  MAINTENANCE_CONFIG: {
    TYPE: 'local',
    ENABLED: false,
    CAUSE: MaintenanceCause.all_services_maintenance
  },
  COOKIES_MANAGER_CONFIG: {
    ACTIVATED: true
  },
  DYNATRACE_CONFIG: {
    ACTIVATED: true
  }
};

jest.unstable_mockModule('@proteo/data-manager', () => ({
  initialize: jest.fn()
}));

let initializeCookiesPolicySuccess = true;
const mockInitializeCookiespolicy = jest.fn() as jest.MockedFunction<typeof initializeCookiesPolicy>;
mockInitializeCookiespolicy.mockImplementation(() => {
  if (initializeCookiesPolicySuccess) {
    return Promise.resolve(true);
  }
  return Promise.reject(false);
});
jest.unstable_mockModule('@proteo/cookies-policy-utils', () => ({
  initializeCookiesPolicy: mockInitializeCookiespolicy
}));

const mockSetCookie = jest.fn() as jest.MockedFunction<typeof setCookie>;
jest.unstable_mockModule('@proteo/cookie-utils', () => ({
  setCookie: mockSetCookie,
  BS_COOKIE_DOMAIN: '.bancsabadell.com',
  DEFAULT_COOKIE_PATH: '/'
}));

let initializeRSASuccess = true;
const mockInitializeRSA = jest.fn() as jest.MockedFunction<typeof initializeRSA>;
mockInitializeRSA.mockImplementation(() => {
  if (initializeRSASuccess) {
    return Promise.resolve(true);
  }
  return Promise.reject(false);
});
jest.unstable_mockModule('@proteo/rsa-util', () => ({
  initializeRSA: mockInitializeRSA
}));

let initializeBioCatchSuccess = true;
const mockInitializeBioCatch = jest.fn() as jest.MockedFunction<typeof initializeBioCatch>;
mockInitializeBioCatch.mockImplementation(() => {
  if (initializeBioCatchSuccess) {
    return Promise.resolve(true);
  }
  return Promise.reject(false);
});

let initializeBioCatchSuccessBSO = true;
const mockInitializeBioCatchBSO = jest.fn() as jest.MockedFunction<typeof initializeBioCatchBSO>;
mockInitializeBioCatchBSO.mockImplementation(() => {
  if (initializeBioCatchSuccessBSO) {
    return Promise.resolve(true);
  }
  return Promise.reject(false);
});
jest.unstable_mockModule('@proteo/biocatch-util', () => ({
  initializeBioCatch: mockInitializeBioCatch,
  initializeBioCatchBSO: mockInitializeBioCatchBSO
}));

let initializeDynatraceSuccess = true;
const mockInitializeDynatrace = jest.fn() as jest.MockedFunction<typeof initializeDynatrace>;
mockInitializeDynatrace.mockImplementation(() => {
  if (initializeDynatraceSuccess) {
    return Promise.resolve(true);
  }
  return Promise.reject(false);
});
jest.unstable_mockModule('@proteo/dynatrace-utils', () => ({
  initializeDynatrace: mockInitializeDynatrace
}));

const mockTrace = jest.fn();
const mockTraceExperience = jest.fn();
const mockSetNumPersona = jest.fn();
const mockSetLoginAccessType = jest.fn();
const mockSetDeepLink = jest.fn();
const mockManageInstanceCookieConsents = jest.fn();
const mockDebug = jest.fn();
const mockPublish = jest.fn();

const testTealiumDriver = new TealiumTxDriver();
const mockGetDriver = jest.fn().mockReturnValue(testTealiumDriver);

let subscriptionMap: Map<string, BsEventBusCallback<any>>;
let mockSubscribe: jest.MockedFunction<typeof EventManager.prototype.subscribe>;
const subscribeCallback = (event: string, msg: string, payload: unknown) => {
  const myFunc: BsEventBusCallback = subscriptionMap.get(event)!;
  myFunc(msg, payload);
};

describe('Core Bootstrap', () => {
  let initializeDataManager: any;
  let CoreBootstrap: any;
  beforeEach(async () => {
    await import('@proteo/platform-utils');
    ({ initialize: initializeDataManager } = await import('@proteo/data-manager'));

    ({ CoreBootstrap } = await import('../core-bootstrap'));
    I18nLangLoader.prototype.loadLocale = jest.fn().mockReturnValue('ca') as jest.MockedFunction<
      typeof I18nLangLoader.prototype.loadLocale
    >;
    // LoggerUtils.initInstance = jest.fn() as jest.MockedFunction<typeof LoggerUtils.initInstance>;

    LoggerUtils.prototype.error = jest.fn() as jest.MockedFunction<typeof LoggerUtils.prototype.error>;

    LoggerUtils.prototype.debug = mockDebug;

    I18n.initInstance = jest.fn() as jest.MockedFunction<typeof I18n.initInstance>;
    AmountUtils.initInstance = jest.fn() as jest.MockedFunction<typeof AmountUtils.initInstance>;
    DateUtils.initInstance = jest.fn() as jest.MockedFunction<typeof DateUtils.initInstance>;
    TagManager.initInstance = jest.fn() as jest.MockedFunction<typeof TagManager.initInstance>;
    EventManager.initInstance = jest.fn() as jest.MockedFunction<typeof EventManager.initInstance>;

    subscriptionMap = new Map<string, any>();
    mockSubscribe = (jest.fn() as jest.MockedFunction<typeof EventManager.prototype.subscribe>).mockImplementation(
      (eventName, callback) => {
        subscriptionMap.set(eventName, callback);
        return Promise.resolve('mockAnswer');
      }
    ) as jest.MockedFunction<typeof EventManager.prototype.subscribe>;
    EventManager.getInstance = jest.fn().mockImplementation(() => ({
      subscribe: mockSubscribe,
      publish: mockPublish
    })) as jest.MockedFunction<typeof EventManager.getInstance>;
    TagManager.getInstance = jest.fn().mockReturnValue({
      getDriver: mockGetDriver,
      trace: mockTrace,
      traceExperience: mockTraceExperience,
      setNumPersona: mockSetNumPersona,
      setLoginAccessType: mockSetLoginAccessType,
      setDeepLink: mockSetDeepLink,
      manageInstanceCookieConsents: mockManageInstanceCookieConsents
    }) as jest.MockedFunction<typeof TagManager.getInstance>;
    StorageManager.initInstance = jest.fn() as jest.MockedFunction<typeof StorageManager.initInstance>;

    initializeCookiesPolicySuccess = true;
    initializeRSASuccess = true;
    initializeBioCatchSuccess = true;
    initializeDynatraceSuccess = true;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize locally by default when no config is provided', async () => {
    await CoreBootstrap.initialize();
    expect(I18n.initInstance).toBeCalledTimes(0);
    expect(AmountUtils.initInstance).toBeCalledTimes(0);
    expect(DateUtils.initInstance).toBeCalledTimes(0);
    expect(initializeDataManager).toBeCalledTimes(0);
    expect(TagManager.initInstance).toBeCalledTimes(0);
    expect(EventManager.initInstance).toBeCalledTimes(0);
    expect(StorageManager.initInstance).toBeCalledTimes(0);
    expect(LoggerUtils.prototype.error).toBeCalledTimes(0);
  });

  it('should initialize every util with its proper config when full config is provided', async () => {
    await CoreBootstrap.initialize(mockConfig);
    expect(I18n.initInstance).toBeCalledTimes(1);
    expect(AmountUtils.initInstance).toBeCalledTimes(1);
    expect(DateUtils.initInstance).toBeCalledTimes(1);
    expect(initializeDataManager).toBeCalledTimes(1);
    expect(TagManager.initInstance).toBeCalledTimes(1);
    expect(EventManager.initInstance).toBeCalledTimes(1);
    expect(StorageManager.initInstance).toBeCalledTimes(1);
    expect(LoggerUtils.prototype.error).toBeCalledTimes(0);
  });

  it('should send deeplink to TagManager on CORE_DEEPLINK event', async () => {
    await CoreBootstrap.initialize(mockConfig);
    expect(mockSubscribe).toHaveBeenCalledWith('CORE_DEEPLINK', expect.anything());
    subscribeCallback('CORE_DEEPLINK', '', { data: { deeplink: 'mockDeeplink' } });
    expect(mockSetDeepLink).toHaveBeenCalledTimes(1);
  });

  it('should set window variable when TRANSLATE_ERROR_CONFIG is set', async () => {
    mockConfig.TRANSLATE_ERROR_CONFIG = {
      DATA_MANAGER: 'TRANSLATE_ERROR'
    };
    await CoreBootstrap.initialize(mockConfig);
    expect(window.BsTranslateErrorDriver).toBe('TRANSLATE_ERROR');
  });

  describe('Auto Trace', () => {
    it('should only trace on CONTEXT_CHANGED event if traceExperience is disabled', async () => {
      mockConfig.TAG_MANAGER_CONFIG!.AUTO_TRACE_EXPERIENCE_DISABLED = true;
      await CoreBootstrap.initialize(mockConfig);
      expect(mockSubscribe).toHaveBeenCalledWith('CONTEXT_CHANGED', expect.anything());
      subscribeCallback('CONTEXT_CHANGED', '', { data: { pageName: 'mockPage' } });
      expect(mockTrace).toHaveBeenCalledTimes(1);
      expect(mockTraceExperience).toHaveBeenCalledTimes(0);
    });

    it('should only traceExperience on CONTEXT_CHANGED event if trace is disabled', async () => {
      mockConfig.TAG_MANAGER_CONFIG!.AUTO_TRACE_DISABLED = true;
      delete mockConfig.TAG_MANAGER_CONFIG!.AUTO_TRACE_EXPERIENCE_DISABLED;
      await CoreBootstrap.initialize(mockConfig);
      expect(mockSubscribe).toHaveBeenCalledWith('CONTEXT_CHANGED', expect.anything());
      subscribeCallback('CONTEXT_CHANGED', '', { data: { pageName: 'mockPage' } });
      expect(mockTrace).toHaveBeenCalledTimes(0);
      expect(mockTraceExperience).toHaveBeenCalledTimes(1);
    });

    it('should not listen to CONTEXT_CHANGED event if both traces have been set to disabled', async () => {
      mockConfig.TAG_MANAGER_CONFIG!.AUTO_TRACE_DISABLED = true;
      mockConfig.TAG_MANAGER_CONFIG!.AUTO_TRACE_EXPERIENCE_DISABLED = true;
      await CoreBootstrap.initialize(mockConfig);
      expect(mockSubscribe).not.toHaveBeenCalledWith('CONTEXT_CHANGED', expect.anything());
    });

    it('should trace on CONTEXT_CHANGED event both methods if none is disabled', async () => {
      delete mockConfig.TAG_MANAGER_CONFIG!.AUTO_TRACE_DISABLED;
      delete mockConfig.TAG_MANAGER_CONFIG!.AUTO_TRACE_EXPERIENCE_DISABLED;
      await CoreBootstrap.initialize(mockConfig);
      expect(mockSubscribe).toHaveBeenCalledWith('CONTEXT_CHANGED', expect.anything());
      subscribeCallback('CONTEXT_CHANGED', '', { data: { pageName: 'mockPage' } });
      expect(mockTrace).toHaveBeenCalledTimes(1);
      expect(mockTraceExperience).toHaveBeenCalledTimes(1);
    });
  });

  describe('FullProteo', () => {
    beforeEach(async () => {
      mockIsFullProteo.mockReturnValueOnce(true);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should handle initializeCookiesPolicy success', async () => {
      await CoreBootstrap.initialize(mockConfig);
      expect(mockDebug).toHaveBeenCalledWith(
        '[Core Bootstrap] initializeCookiesPolicy initialized correctly in FullProteo scenario',
        expect.anything()
      );
    });

    it('should handle initializeCookiesPolicy error', async () => {
      initializeCookiesPolicySuccess = false;
      await CoreBootstrap.initialize(mockConfig);
      await expect(mockInitializeCookiespolicy).rejects.toBe(false);
      expect(mockDebug).toHaveBeenCalledWith(
        '[Core Bootstrap] Error in catch from initializeCookiesPolicy in FullProteo scenario',
        expect.anything()
      );
    });

    it('should handle initializeRSA success', async () => {
      await CoreBootstrap.initialize(mockConfig);
      expect(mockDebug).toHaveBeenCalledWith(
        '[Core Bootstrap] initializeRSA initialized correctly in FullProteo scenario',
        expect.anything()
      );
    });

    it('should handle initializeRSA error', async () => {
      initializeRSASuccess = false;
      await CoreBootstrap.initialize(mockConfig);
      await expect(mockInitializeRSA).rejects.toBe(false);
      expect(mockDebug).toHaveBeenCalledWith(
        '[Core Bootstrap] Error in catch from initializeRSA in FullProteo scenario',
        expect.anything()
      );
    });

    it('should handle initializeBioCatch success', async () => {
      await CoreBootstrap.initialize(mockConfig);
      expect(mockDebug).toHaveBeenCalledWith(
        '[Core Bootstrap] initializeBioCatch initialized correctly in FullProteo scenario',
        expect.anything()
      );
    });

    it('should handle initializeBioCatch error', async () => {
      initializeBioCatchSuccess = false;
      await CoreBootstrap.initialize(mockConfig);
      await expect(mockInitializeBioCatch).rejects.toBe(false);
      expect(mockDebug).toHaveBeenCalledWith(
        '[Core Bootstrap] Error in catch from initializeBioCatch in FullProteo scenario',
        expect.anything()
      );
    });

    it('should initialize TagManager if no cookies config is set', async () => {
      delete mockConfig.COOKIES_MANAGER_CONFIG;
      await CoreBootstrap.initialize(mockConfig);
      expect(TagManager.initInstance).toBeCalledTimes(2);
    });

    it('should not process optanon consents event', async () => {
      await CoreBootstrap.initialize(mockConfig);
      expect(mockSubscribe).not.toHaveBeenCalledWith('BROADCAST_OPTANON_CONSENT', expect.anything());
    });
  });

  describe('Native', () => {
    beforeEach(async () => {
      mockIsFullProteo.mockReturnValueOnce(false);
      mockIsNative.mockReturnValueOnce(true);
    });

    it('should not attempt initializeCookiesPolicy', async () => {
      await CoreBootstrap.initialize(mockConfig);
      expect(mockInitializeCookiespolicy).not.toHaveBeenCalled();
    });

    it('should not attempt initializeRSA', async () => {
      await CoreBootstrap.initialize(mockConfig);
      expect(mockInitializeRSA).not.toHaveBeenCalled();
    });

    it('should handle initializeBioCatch success', async () => {
      await CoreBootstrap.initialize(mockConfig);
      expect(mockDebug).toHaveBeenCalledWith(
        '[Core Bootstrap] initializeBioCatch initialized correctly in native scenario',
        expect.anything()
      );
    });

    it('should handle initializeBioCatch error', async () => {
      initializeBioCatchSuccess = false;
      await CoreBootstrap.initialize(mockConfig);
      await expect(mockInitializeBioCatch).rejects.toBe(false);
      expect(mockDebug).toHaveBeenCalledWith(
        '[Core Bootstrap] Error in catch from initializeBioCatch in native scenario',
        expect.anything()
      );
    });

    it('should initialize TagManager', async () => {
      await CoreBootstrap.initialize(mockConfig);
      expect(TagManager.initInstance).toBeCalledTimes(2);
    });

    it('should initialize TagManager', async () => {
      await CoreBootstrap.initialize(mockConfig);
      expect(TagManager.initInstance).toBeCalledTimes(2);
    });

    it('should properly process optanon consents event', async () => {
      await CoreBootstrap.initialize(mockConfig);

      const mockPayload: EventPayload<ConsentsEventPayload> = {
        data: { consentedDate: 'mockConsents', groups: 'mockGroups', data: { appID: 'mockID', version: '1.0.0' } }
      };
      expect(mockSubscribe).toHaveBeenCalledWith('BROADCAST_OPTANON_CONSENT', expect.anything());
      subscribeCallback('BROADCAST_OPTANON_CONSENT', '', mockPayload);
      expect(mockSetCookie).toHaveBeenCalledTimes(1);
      expect(mockManageInstanceCookieConsents).toHaveBeenCalledTimes(1);
    });

    describe('User info management', () => {
      it('should send numpersona to TagManager on BROADCAST_USER_INFO event if properly set', async () => {
        expect.assertions(4);
        extractUserInfoFromTokenMock.mockReturnValueOnce({ numpersona: 'mockNumPersona' });
        await CoreBootstrap.initialize(mockConfig);
        expect(mockSubscribe).toHaveBeenCalledWith('BROADCAST_USER_INFO', expect.anything());
        subscribeCallback('BROADCAST_USER_INFO', '', { userInfo: 'mockJwtToken' });
        expect(extractUserInfoFromTokenMock).toHaveBeenCalledWith('mockJwtToken');
        expect(mockSetNumPersona).toHaveBeenCalledTimes(1);
        expect(mockSetNumPersona).toHaveBeenCalledWith('mockNumPersona');
      });

      it('should manage userInfo token error parse', async () => {
        expect.assertions(4);
        extractUserInfoFromTokenMock.mockImplementationOnce(() => {
          throw new Error();
        });
        await CoreBootstrap.initialize(mockConfig);
        expect(mockSubscribe).toHaveBeenCalledWith('BROADCAST_USER_INFO', expect.anything());
        subscribeCallback('BROADCAST_USER_INFO', '', { userInfo: 'wrongJWTToken' });
        expect(extractUserInfoFromTokenMock).toHaveBeenCalledWith('wrongJWTToken');
        expect(LoggerUtils.prototype.error).toHaveBeenCalledWith('[CoreBootstrap] User info parse error: Error', {
          remoteLogger: true,
          type: 'application'
        });
        expect(mockSetNumPersona).not.toHaveBeenCalled();
      });
    });

    describe('Login access type', () => {
      it('should be able to receive login access type from broadcast', async () => {
        expect.assertions(2);
        await CoreBootstrap.initialize(mockConfig);
        expect(mockSubscribe).toHaveBeenCalledWith('BROADCAST_LOGIN_ACCESS_TYPE', expect.anything());
        subscribeCallback('BROADCAST_LOGIN_ACCESS_TYPE', '', { acceso: 'mockAccessType' });
        expect(mockSetLoginAccessType).toHaveBeenCalled();
      });
    });
  });

  describe('Other cases', () => {
    beforeEach(async () => {
      mockIsFullProteo.mockReturnValueOnce(false);
      mockIsNative.mockReturnValueOnce(false);
    });

    it('should not attempt initializeCookiesPolicy', async () => {
      await CoreBootstrap.initialize(mockConfig);
      expect(mockInitializeCookiespolicy).not.toHaveBeenCalled();
    });

    it('should not attempt initializeRSA', async () => {
      await CoreBootstrap.initialize(mockConfig);
      expect(mockInitializeRSA).not.toHaveBeenCalled();
    });

    it('should not attempt initializeBioCatch or initializeBioCatchBSO', async () => {
      await CoreBootstrap.initialize(mockConfig);
      expect(mockInitializeBioCatch).not.toHaveBeenCalled();
      expect(mockInitializeBioCatchBSO).not.toHaveBeenCalled();
    });

    it('should attempt to initializeBioCatchBSO', async () => {
      mockWebContainer.mockReturnValueOnce(true);
      await CoreBootstrap.initialize(mockConfig);
      expect(mockInitializeBioCatchBSO).toHaveBeenCalled();
    });

    it('should attempt to initializeBioCatchBSO and be rejected', async () => {
      mockWebContainer.mockReturnValueOnce(true);
      initializeBioCatchSuccessBSO = false;
      await CoreBootstrap.initialize(mockConfig);
      expect(mockInitializeBioCatchBSO).rejects.toBe(false);
    });

    it('should initialize TagManager', async () => {
      await CoreBootstrap.initialize(mockConfig);
      expect(TagManager.initInstance).toBeCalledTimes(2);
    });

    it('should not process optanon consents event', async () => {
      await CoreBootstrap.initialize(mockConfig);
      expect(mockSubscribe).not.toHaveBeenCalledWith('BROADCAST_OPTANON_CONSENT', expect.anything());
    });
  });

  describe('Dynatrace', () => {
    it('should handle initializeDynatrace success', async () => {
      await CoreBootstrap.initialize(mockConfig);
      expect(mockDebug).toHaveBeenCalledWith(
        '[Core Bootstrap] initializeDynatrace initialized correctly',
        expect.anything()
      );
    });

    it('should handle initializeDynatrace error', async () => {
      initializeDynatraceSuccess = false;
      await CoreBootstrap.initialize(mockConfig);
      await expect(mockInitializeDynatrace).rejects.toBe(false);
      expect(mockDebug).toHaveBeenCalledWith(
        '[Core Bootstrap] Error in catch from initializeDynatrace',
        expect.anything()
      );
    });

    it('should not attempt dynatrace initialization if config is not set', async () => {
      delete mockConfig.DYNATRACE_CONFIG;
      await CoreBootstrap.initialize(mockConfig);
      expect(mockInitializeDynatrace).not.toHaveBeenCalled();
    });
  });
});
