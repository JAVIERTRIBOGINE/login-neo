import { afterEach, describe, expect, it, jest } from '@jest/globals';
import type { TagManagerConfiguration } from '@proteo/types';

import { BS_COOKIE_DOMAIN, DEFAULT_COOKIE_PATH, type getCookie, type removeCookie } from '@proteo/cookie-utils';
import { EventManager } from '@proteo/event-bus';
import type { isNative } from '@proteo/platform-utils';

const mockConfigTXP4: Record<string, TagManagerConfiguration> = {
  TXP4: {
    class: []
  }
};

const mockConfigTX: Record<string, TagManagerConfiguration> = {
  TX: {
    class: []
  }
};

const mockConfigMixed: Record<string, TagManagerConfiguration> = {
  TX: {
    class: []
  },
  TXP4: {
    class: []
  }
};

const mockTraceData = { data: { event: 'view' } };

const mockGetCookie: jest.MockedFunction<typeof getCookie> = jest.fn() as jest.MockedFunction<typeof getCookie>;
const mockRemoveCookie: jest.MockedFunction<typeof removeCookie> = jest.fn() as jest.MockedFunction<typeof removeCookie>;
jest.unstable_mockModule('@proteo/cookie-utils', () => ({
  getCookie: mockGetCookie,
  BS_COOKIE_DOMAIN: '.bancsabadell.com',
  DEFAULT_COOKIE_PATH: '/',
  removeCookie: mockRemoveCookie
}));

const mockSetupTXP4: jest.MockedFunction<any> = jest.fn();
const mockSetBSMAnalyticsData: jest.MockedFunction<any> = jest.fn();
const mockTraceTXP4: jest.MockedFunction<any> = jest.fn();
const mockTraceExperienceTXP4: jest.MockedFunction<any> = jest.fn();
const mockFlushDataLayer: jest.MockedFunction<any> = jest.fn();
jest.unstable_mockModule('@proteo/tag-manager-driver-tealium-tx-p4', () => ({
  TealiumTxP4Driver: jest.fn().mockImplementation(() => ({
    setup: mockSetupTXP4,
    setBSMAnalyticsData: mockSetBSMAnalyticsData,
    trace: mockTraceTXP4,
    traceExperience: mockTraceExperienceTXP4,
    flushDataLayer: mockFlushDataLayer
  }))
}));

const mockTraceTX: jest.MockedFunction<any> = jest.fn();
const mockSetupTX: jest.MockedFunction<any> = jest.fn();
jest.unstable_mockModule('@proteo/tag-manager-driver-tealium-tx', () => ({
  TealiumTxDriver: jest.fn().mockImplementation(() => ({
    setup: mockSetupTX,
    trace: mockTraceTX
  }))
}));

const mockError: jest.MockedFunction<any> = jest.fn();
const mockWarn: jest.MockedFunction<any> = jest.fn();
const mockDebug: jest.MockedFunction<any> = jest.fn();

const mockIsNative: jest.MockedFunction<typeof isNative> = jest.fn() as jest.MockedFunction<typeof isNative>;
jest.unstable_mockModule('@proteo/platform-utils', () => ({
  isNative: mockIsNative
}));

const mockPublish = jest.fn();

describe('tag-manager', () => {
  let TealiumTxDriver: any;
  let TagManager: any;
  let LoggerUtils: any;
  let setConsentsSpy: any;
  let initializeDriversSpy: any;
  let convertToTealiumSpy: any;
  const OPTANON_COOKIE = 'OptanonConsent';

  beforeEach(async () => {
    mockGetCookie.mockImplementation((_name) => {
      return undefined;
    });
    await import('@proteo/cookie-utils');
    await import('@proteo/tag-manager-driver-tealium-tx-p4');
    ({ TealiumTxDriver } = await import('@proteo/tag-manager-driver-tealium-tx'));
    ({ TagManager } = await import('../tag-manager'));
    ({ LoggerUtils } = await import('@proteo/logger-utils'));

    initializeDriversSpy = jest.spyOn(TagManager.prototype, 'initializeDrivers');
    setConsentsSpy = jest.spyOn(TagManager.prototype, 'setConsents');
    convertToTealiumSpy = jest.spyOn(TagManager.prototype, 'convertToTealium');
    LoggerUtils.prototype.error = mockError;
    LoggerUtils.prototype.warn = mockWarn;
    LoggerUtils.prototype.debug = mockDebug;

    EventManager.initInstance = jest.fn() as jest.MockedFunction<typeof EventManager.initInstance>;

    EventManager.getInstance = jest.fn().mockImplementation(() => ({
      publish: mockPublish
    })) as jest.MockedFunction<typeof EventManager.getInstance>;
  });

  afterEach(() => {
    jest.clearAllMocks();
    window.BsTagManager = undefined as any;
    window._tempBSMAnalytics = undefined;
  });

  describe('initialization', () => {
    it('should return undefined when getting instance if initInstance has not been called', () => {
      expect.assertions(1);
      expect(TagManager.getInstance()).toBeUndefined();
    });

    it('should properly return instance when getting instance after initInstance', () => {
      expect.assertions(1);
      TagManager.initInstance(mockConfigTXP4, true);
      expect(TagManager.getInstance()).toBeTruthy();
    });

    it('should not attempt initialize drivers in early mode', () => {
      expect.assertions(2);
      TagManager.initInstance(mockConfigTXP4, true);
      expect(mockGetCookie).not.toHaveBeenCalled();
      expect(mockSetupTXP4).not.toHaveBeenCalled();
    });

    it('should initialize drivers in not early mode', async () => {
      expect.assertions(2);
      TagManager.initInstance(mockConfigTXP4, false);
      await Promise.all([initializeDriversSpy.mock.results[0].value]);
      expect(mockGetCookie).toHaveBeenCalled();
      expect(mockSetupTXP4).toHaveBeenCalled();
    });

    it('should not replace existing instance if initialized twice', async () => {
      expect.assertions(3);
      TagManager.initInstance(mockConfigTXP4, false);
      await Promise.all([initializeDriversSpy.mock.results[0].value]);
      TagManager.initInstance(mockConfigTXP4, false);
      await Promise.all([initializeDriversSpy.mock.results[0].value]);
      expect(initializeDriversSpy).toHaveBeenCalledTimes(1);
      expect(mockGetCookie).toHaveBeenCalledTimes(1);
      expect(mockSetupTXP4).toHaveBeenCalledTimes(1);
    });

    it('should store temporary analytics data if any when initializing', async () => {
      expect.assertions(3);
      window._tempBSMAnalytics = { event: 'view' };
      TagManager.initInstance(mockConfigTXP4, false);
      await Promise.all([initializeDriversSpy.mock.results[0].value]);
      expect(mockSetupTXP4).toHaveBeenCalled();
      expect(window._tempBSMAnalytics).toBeUndefined();
      expect(mockSetBSMAnalyticsData).toHaveBeenCalledWith({ event: 'view' });
    });

    it('should not attempt to store temporary analytics data in early mode', () => {
      expect.assertions(3);
      window._tempBSMAnalytics = { event: 'view' };
      TagManager.initInstance(mockConfigTXP4, true);
      expect(mockSetupTXP4).not.toHaveBeenCalled();
      expect(window._tempBSMAnalytics).toStrictEqual({ event: 'view' });
      expect(mockSetBSMAnalyticsData).not.toHaveBeenCalled();
    });

    it('should fail temporary analytics data store if no TXP4 driver is available', async () => {
      expect.assertions(3);
      window._tempBSMAnalytics = { event: 'view' };
      mockConfigTX.TX.driver = new TealiumTxDriver();
      TagManager.initInstance(mockConfigTX, false);
      await Promise.all([initializeDriversSpy.mock.results[0].value]);
      expect(mockSetupTX).toHaveBeenCalled();
      expect(window._tempBSMAnalytics).toBeUndefined();
      expect(mockWarn).toHaveBeenCalledWith('[TagManager] BSM Analytics data could not be stored, missing proper driver', {
        remoteLogger: true,
        type: 'application'
      });
    });

    it('should create TXP4 driver if no config is passed', async () => {
      expect.assertions(2);
      TagManager.initInstance(undefined, false);
      await Promise.all([initializeDriversSpy.mock.results[0].value]);
      expect(mockSetupTXP4).toHaveBeenCalled();
      expect(mockDebug).toHaveBeenCalledWith('[TagManager] no configuration passed. Applying default driver: TealiumTxP4Driver', {
        remoteLogger: true,
        type: 'application'
      });
    });

    it('should create TXP4 driver if none is set in the config', async () => {
      expect.assertions(2);
      TagManager.initInstance(mockConfigTXP4, false);
      await Promise.all([initializeDriversSpy.mock.results[0].value]);
      expect(mockSetupTXP4).toHaveBeenCalled();
      expect(mockDebug).toHaveBeenCalledWith('[TagManager] no driver passed to the configuration. Applying default driver: TealiumTxP4Driver', {
        remoteLogger: true,
        type: 'application'
      });
    });

    it('should create specified driver in the config', () => {
      expect.assertions(2);
      mockConfigTX.TX.driver = new TealiumTxDriver();
      TagManager.initInstance(mockConfigTX, false);
      expect(mockSetupTX).toHaveBeenCalled();
      expect(mockDebug).not.toHaveBeenCalled();
    });

    it('should instantiate multiple drivers if specified', () => {
      expect.assertions(4);
      mockConfigMixed.TX.driver = new TealiumTxDriver();
      TagManager.initInstance(mockConfigMixed, false);
      expect(mockSetupTX).toHaveBeenCalled();
      expect(mockSetupTXP4).toHaveBeenCalled();
      const driversMap = (TagManager.getInstance() as any)._driversMap;
      expect(driversMap.get('TX')).toBeTruthy();
      expect(driversMap.get('TXP4')).toBeTruthy();
    });
  });

  describe('consents', () => {
    it('should not set consents if cookie does not exist at initialization', async () => {
      expect.assertions(3);
      TagManager.initInstance(mockConfigTXP4, false);
      await Promise.all([initializeDriversSpy.mock.results[0].value]);
      expect(mockSetupTXP4).toHaveBeenCalled();
      expect(mockGetCookie).toHaveBeenCalled();
      expect(setConsentsSpy).not.toHaveBeenCalled();
    });

    it('should set consents properly if proper cookie exists at initialization', async () => {
      expect.assertions(4);
      mockGetCookie.mockReturnValueOnce('groups=mockConsents');
      TagManager.initInstance(mockConfigTXP4, false);
      await Promise.all([initializeDriversSpy.mock.results[0].value]);
      expect(mockSetupTXP4).toHaveBeenCalled();
      expect(mockGetCookie).toHaveBeenCalled();
      expect(setConsentsSpy).toHaveBeenCalledWith('mockConsents');
      expect(mockSetBSMAnalyticsData).toHaveBeenCalledWith({ globalInfo: { consentCategories: 'mockConsents' } });
    });

    it('should not set consents if cookie exists but does not have proper consents at initialization', async () => {
      expect.assertions(4);
      mockGetCookie.mockReturnValueOnce('mockWrongCookieConsents');
      TagManager.initInstance(mockConfigTXP4, false);
      await Promise.all([initializeDriversSpy.mock.results[0].value]);
      expect(mockSetupTXP4).toHaveBeenCalled();
      expect(mockGetCookie).toHaveBeenCalled();
      expect(setConsentsSpy).not.toHaveBeenCalled();
      expect(mockError).toHaveBeenCalledWith('[TagManager] Wrong consent cookie format: mockWrongCookieConsents', {
        remoteLogger: true,
        type: 'application'
      });
    });

    it('should not attempt to set consents when manageCookieConsents is called externally and instance does not exist', () => {
      expect.assertions(1);
      TagManager.manageCookieConsents();
      expect(mockGetCookie).not.toHaveBeenCalled();
    });

    it('should attempt to set consents when manageCookieConsents is called externally and instance exists', async () => {
      expect.assertions(1);
      TagManager.initInstance(mockConfigTXP4, false);
      await Promise.all([initializeDriversSpy.mock.results[0].value]);
      TagManager.manageCookieConsents();
      expect(mockGetCookie).toHaveBeenCalledTimes(2);
    });

    it('should store consents temporarily if manageCookieConsents is called externally and instance is in early mode', () => {
      expect.assertions(2);
      mockGetCookie.mockReturnValueOnce('groups=mockConsents');
      TagManager.initInstance(mockConfigTXP4, true);
      TagManager.manageCookieConsents();
      expect(mockGetCookie).toHaveBeenCalledTimes(1);
      expect(window._tempBSMAnalytics).toStrictEqual({ globalInfo: { consentCategories: 'mockConsents' } });
    });

    describe('clear consents', () => {
      it('should remove cookie, flush dataLayer and publish event on clearConsents, when native', async () => {
        expect.assertions(3);
        TagManager.initInstance(mockConfigTXP4, false);
        mockIsNative.mockReturnValueOnce(true);
        await Promise.all([initializeDriversSpy.mock.results[0].value]);
        TagManager.getInstance().clearConsents(true);
        expect(mockRemoveCookie).toHaveBeenCalledWith(OPTANON_COOKIE, DEFAULT_COOKIE_PATH, BS_COOKIE_DOMAIN);
        expect(mockFlushDataLayer).toHaveBeenCalled();
        expect(mockPublish).toHaveBeenCalledTimes(2);
      });

      it('should not send SHOW_BANNER_CONSENT if not flagged', async () => {
        expect.assertions(4);
        TagManager.initInstance(mockConfigTXP4, false);
        mockIsNative.mockReturnValueOnce(true);
        await Promise.all([initializeDriversSpy.mock.results[0].value]);
        TagManager.getInstance().clearConsents();
        expect(mockRemoveCookie).toHaveBeenCalledWith(OPTANON_COOKIE, DEFAULT_COOKIE_PATH, BS_COOKIE_DOMAIN);
        expect(mockFlushDataLayer).toHaveBeenCalled();
        expect(mockPublish).toHaveBeenCalledTimes(1);
        expect(mockPublish).not.toHaveBeenCalledWith('SHOW_BANNER_CONSENT', expect.anything());
      });

      it('should not send events when not native', async () => {
        expect.assertions(3);
        TagManager.initInstance(mockConfigTXP4, false);
        mockIsNative.mockReturnValueOnce(false);
        await Promise.all([initializeDriversSpy.mock.results[0].value]);
        TagManager.getInstance().clearConsents();
        expect(mockRemoveCookie).toHaveBeenCalledWith(OPTANON_COOKIE, DEFAULT_COOKIE_PATH, BS_COOKIE_DOMAIN);
        expect(mockFlushDataLayer).toHaveBeenCalled();
        expect(mockPublish).not.toHaveBeenCalled();
      });
    });
  });

  describe('trace', () => {
    it('should push trace to the pool in early mode', () => {
      expect.assertions(3);
      TagManager.initInstance(mockConfigTXP4, true);
      const tagManagerInstance = TagManager.getInstance();
      tagManagerInstance.trace(mockTraceData);
      expect(tagManagerInstance.earlyMode).toBe(true);
      expect(tagManagerInstance.tracePool).toContain(mockTraceData);
      expect(mockTraceTXP4).not.toHaveBeenCalled();
    });

    it('should push trace to the pool if consents are not set', async () => {
      expect.assertions(4);
      TagManager.initInstance(mockConfigTXP4, false);
      await Promise.all([initializeDriversSpy.mock.results[0].value]);
      const tagManagerInstance = TagManager.getInstance();
      tagManagerInstance.trace(mockTraceData);
      expect(tagManagerInstance.earlyMode).toBe(false);
      expect(tagManagerInstance.consents).toStrictEqual('');
      expect(tagManagerInstance.tracePool).toContain(mockTraceData);
      expect(mockTraceTXP4).not.toHaveBeenCalledWith(mockTraceData);
    });

    it('should trace through driver if consents are set and not early mode', async () => {
      expect.assertions(4);
      mockGetCookie.mockReturnValueOnce('groups=mockConsents');
      TagManager.initInstance(mockConfigTXP4, false);
      await Promise.all([initializeDriversSpy.mock.results[0].value]);
      const tagManagerInstance = TagManager.getInstance();
      tagManagerInstance.trace(mockTraceData);
      expect(tagManagerInstance.earlyMode).toBe(false);
      expect(tagManagerInstance.consents).toStrictEqual('mockConsents');
      expect(tagManagerInstance.tracePool).not.toContain(mockTraceData);
      expect(mockTraceTXP4).toHaveBeenCalledWith(mockTraceData);
    });

    it('should empty trace pool when switching from early to not early mode and consents are set', async () => {
      expect.assertions(4);
      TagManager.initInstance(mockConfigTXP4, true);
      const tagManagerInstance = TagManager.getInstance();
      tagManagerInstance.trace(mockTraceData);
      expect(tagManagerInstance.tracePool).toContain(mockTraceData);

      mockGetCookie.mockReturnValue('groups=mockConsents');
      TagManager.manageCookieConsents();
      expect(tagManagerInstance.tracePool).toContain(mockTraceData);

      TagManager.initInstance(mockConfigTXP4, false);
      await Promise.all([initializeDriversSpy.mock.results[0].value]);
      expect(mockTraceTXP4).toHaveBeenCalledWith(mockTraceData);
      expect(tagManagerInstance.tracePool).not.toContain(mockTraceData);
    });

    it('should not empty trace pool when switching from early to not early mode if consents are not set', async () => {
      expect.assertions(3);
      TagManager.initInstance(mockConfigTXP4, true);
      const tagManagerInstance = TagManager.getInstance();
      tagManagerInstance.trace(mockTraceData);
      expect(tagManagerInstance.tracePool).toContain(mockTraceData);

      TagManager.initInstance(mockConfigTXP4, false);
      await Promise.all([initializeDriversSpy.mock.results[0].value]);
      expect(mockTraceTXP4).not.toHaveBeenCalled();
      expect(tagManagerInstance.tracePool).toContain(mockTraceData);
    });

    it('should empty trace pool when receiving consents if not early mode', async () => {
      expect.assertions(5);
      TagManager.initInstance(mockConfigTXP4, true);
      const tagManagerInstance = TagManager.getInstance();
      tagManagerInstance.trace(mockTraceData);
      expect(tagManagerInstance.tracePool).toContain(mockTraceData);

      TagManager.initInstance(mockConfigTXP4, false);
      await Promise.all([initializeDriversSpy.mock.results[0].value]);
      expect(mockTraceTXP4).not.toHaveBeenCalled();
      expect(tagManagerInstance.tracePool).toContain(mockTraceData);

      mockGetCookie.mockReturnValue('groups=mockConsents');
      TagManager.manageCookieConsents();
      expect(mockTraceTXP4).toHaveBeenCalled();
      expect(tagManagerInstance.tracePool).not.toContain(mockTraceData);
    });

    it('should log a warning if TagRequest has no proper structure', () => {
      expect.assertions(1);
      TagManager.initInstance(mockConfigTXP4, true);
      const tagManagerInstance = TagManager.getInstance();
      tagManagerInstance.trace({ wrongStructure: 'mock' });
      expect(mockWarn).toHaveBeenCalledWith('[TagManager] Wrong TagRequest structure', { remoteLogger: true, type: 'application' });
    });

    it('should flatten trace for Tealium driver', async () => {
      mockConfigTX.TX.driver = new TealiumTxDriver();
      mockGetCookie.mockReturnValueOnce('groups=mockConsents');
      TagManager.initInstance(mockConfigTX, false);
      await Promise.all([initializeDriversSpy.mock.results[0].value]);
      TagManager.getInstance().trace({
        data: {
          a: {
            a1: 'a1',
            a2: 'a2',
            a3: [
              {
                a31: 'a311',
                a32: 'a321'
              },
              {
                a31: 'a312',
                a32: 'a322'
              }
            ]
          },
          b: {
            b1: [
              {
                b11: 'b111',
                b12: 'b121',
                b13: 'b131'
              }
            ],
            b2: 'b2'
          }
        }
      });
      expect(convertToTealiumSpy).toHaveBeenCalled();
      expect(mockTraceTX).toHaveBeenCalledWith({
        data: {
          'a.a1': 'a1',
          'a.a2': 'a2',
          'a.a3': [
            { a31: 'a311', a32: 'a321' },
            { a31: 'a312', a32: 'a322' }
          ],
          'b.b1': [{ b11: 'b111', b12: 'b121', b13: 'b131' }],
          'b.b2': 'b2'
        }
      });
    });

    it('should not even try flattening if no data field is present in TagRequest but send trace the same', async () => {
      mockConfigTX.TX.driver = new TealiumTxDriver();
      mockGetCookie.mockReturnValueOnce('groups=mockConsents');
      TagManager.initInstance(mockConfigTX, false);
      await Promise.all([initializeDriversSpy.mock.results[0].value]);
      TagManager.getInstance().trace({ wrongStructure: 'mock' });
      expect(convertToTealiumSpy).not.toHaveBeenCalled();
      expect(mockTraceTX).toHaveBeenCalledWith({ wrongStructure: 'mock' });
    });
  });

  describe('traceExperience', () => {
    it('should not traceExperience in early mode', () => {
      expect.assertions(2);
      TagManager.initInstance(mockConfigTXP4, true);
      const tagManagerInstance = TagManager.getInstance();
      tagManagerInstance.traceExperience(mockTraceData);
      expect(tagManagerInstance.earlyMode).toBe(true);
      expect(mockTraceExperienceTXP4).not.toHaveBeenCalled();
    });

    it('should not traceExperience if consents are not set', async () => {
      expect.assertions(3);
      TagManager.initInstance(mockConfigTXP4, false);
      await Promise.all([initializeDriversSpy.mock.results[0].value]);
      const tagManagerInstance = TagManager.getInstance();
      tagManagerInstance.traceExperience(mockTraceData);
      expect(tagManagerInstance.earlyMode).toBe(false);
      expect(tagManagerInstance.consents).toStrictEqual('');
      expect(mockTraceExperienceTXP4).not.toHaveBeenCalled();
    });

    it('should traceExperience through driver if consents are set and not early mode', async () => {
      expect.assertions(3);
      mockGetCookie.mockReturnValueOnce('groups=mockConsents');
      TagManager.initInstance(mockConfigTXP4, false);
      await Promise.all([initializeDriversSpy.mock.results[0].value]);
      const tagManagerInstance = TagManager.getInstance();
      tagManagerInstance.traceExperience(mockTraceData);
      expect(tagManagerInstance.earlyMode).toBe(false);
      expect(tagManagerInstance.consents).toStrictEqual('mockConsents');
      expect(mockTraceExperienceTXP4).toHaveBeenCalled();
    });

    it('should log a warning if TagRequest has no proper structure', () => {
      expect.assertions(1);
      TagManager.initInstance(mockConfigTXP4, true);
      TagManager.getInstance().traceExperience({ wrongStructure: 'mock' });
      expect(mockWarn).toHaveBeenCalledWith('[TagManager] Wrong TagRequest structure', { remoteLogger: true, type: 'application' });
    });

    it('should log a warning if no TXP4 driver is present', async () => {
      expect.assertions(4);
      mockConfigTX.TX.driver = new TealiumTxDriver();
      mockGetCookie.mockReturnValueOnce('groups=mockConsents');
      TagManager.initInstance(mockConfigTX, false);
      await Promise.all([initializeDriversSpy.mock.results[0].value]);
      const tagManagerInstance = TagManager.getInstance();
      tagManagerInstance.traceExperience(mockTraceData);
      expect(tagManagerInstance.earlyMode).toBe(false);
      expect(tagManagerInstance.consents).toStrictEqual('mockConsents');
      expect(mockTraceExperienceTXP4).not.toHaveBeenCalled();
      expect(mockWarn).toHaveBeenCalledWith('[TagManager] No TXP4 driver set, traceExperience could not be sent', {
        remoteLogger: true,
        type: 'application'
      });
    });
  });

  describe('numpersona', () => {
    it('should temporarily set numpersona when requested if early mode', async () => {
      expect.assertions(2);
      TagManager.initInstance(mockConfigTXP4, true);
      TagManager.getInstance().setNumPersona('mockNumPersona');
      expect(mockSetBSMAnalyticsData).not.toHaveBeenCalled();
      expect(window._tempBSMAnalytics).toStrictEqual({ userInfo: { numper: 'mockNumPersona' } });
    });

    it('should keep existing temporary info when setting numpersona', async () => {
      expect.assertions(2);
      window._tempBSMAnalytics = { event: 'view' };
      TagManager.initInstance(mockConfigTXP4, true);
      TagManager.getInstance().setNumPersona('mockNumPersona');
      expect(mockSetBSMAnalyticsData).not.toHaveBeenCalled();
      expect(window._tempBSMAnalytics).toStrictEqual({ event: 'view', userInfo: { numper: 'mockNumPersona' } });
    });

    it('should assign numpersona to TXP4 driver if not early mode', async () => {
      expect.assertions(2);
      TagManager.initInstance(mockConfigTXP4, false);
      await Promise.all([initializeDriversSpy.mock.results[0].value]);
      TagManager.getInstance().setNumPersona('mockNumPersona');
      expect(mockSetBSMAnalyticsData).toHaveBeenCalledWith({ userInfo: { numper: 'mockNumPersona' } });
      expect(window._tempBSMAnalytics).toBeUndefined();
    });
  });

  describe('login access type', () => {
    it('should temporarily set login access type when requested if early mode', async () => {
      expect.assertions(2);
      TagManager.initInstance(mockConfigTXP4, true);
      TagManager.getInstance().setLoginAccessType('mockAccessType');
      expect(mockSetBSMAnalyticsData).not.toHaveBeenCalled();
      expect(window._tempBSMAnalytics).toStrictEqual({ globalInfo: { acceso: 'mockAccessType' } });
    });

    it('should keep existing temporary info when setting login access type', async () => {
      expect.assertions(2);
      window._tempBSMAnalytics = { event: 'view' };
      TagManager.initInstance(mockConfigTXP4, true);
      TagManager.getInstance().setLoginAccessType('mockAccessType');
      expect(mockSetBSMAnalyticsData).not.toHaveBeenCalled();
      expect(window._tempBSMAnalytics).toStrictEqual({ event: 'view', globalInfo: { acceso: 'mockAccessType' } });
    });

    it('should assign login access type to TXP4 driver if not early mode', async () => {
      expect.assertions(2);
      TagManager.initInstance(mockConfigTXP4, false);
      await Promise.all([initializeDriversSpy.mock.results[0].value]);
      TagManager.getInstance().setLoginAccessType('mockAccessType');
      expect(mockSetBSMAnalyticsData).toHaveBeenCalledWith({ globalInfo: { acceso: 'mockAccessType' } });
      expect(window._tempBSMAnalytics).toBeUndefined();
    });
  });

  describe('deeplink', () => {
    it('should temporarily set deeplink when requested if early mode', () => {
      TagManager.initInstance(mockConfigTXP4, true);
      TagManager.getInstance().setDeepLink('mockDeepLinkUrl');
      expect(mockSetBSMAnalyticsData).not.toHaveBeenCalled();
      expect(window._tempBSMAnalytics).toStrictEqual({
        eventInfo: { deeplink: { deep_link_origin: 'universal-link', deep_link_url: 'mockDeepLinkUrl' } }
      });
    });

    it('should keep existing temporary info when setting deeplink', () => {
      window._tempBSMAnalytics = { event: 'view' };
      TagManager.initInstance(mockConfigTXP4, true);
      TagManager.getInstance().setDeepLink('mockDeepLinkUrl');
      expect(mockSetBSMAnalyticsData).not.toHaveBeenCalled();
      expect(window._tempBSMAnalytics).toStrictEqual({
        event: 'view',
        eventInfo: { deeplink: { deep_link_origin: 'universal-link', deep_link_url: 'mockDeepLinkUrl' } }
      });
    });

    it('should assign deeplink to TXP4 driver if not early mode', async () => {
      TagManager.initInstance(mockConfigTXP4, false);
      await Promise.all([initializeDriversSpy.mock.results[0].value]);
      TagManager.getInstance().setDeepLink('mockDeepLinkUrl');
      expect(mockSetBSMAnalyticsData).toHaveBeenCalledWith({
        eventInfo: { deeplink: { deep_link_origin: 'universal-link', deep_link_url: 'mockDeepLinkUrl' } }
      });
      expect(window._tempBSMAnalytics).toBeUndefined();
    });
  });

  it('should set temporary BSM data directly on window if no instance is available', () => {
    TagManager.storeBSMAnalyticsData({ event: 'view' });
    expect(window._tempBSMAnalytics).toStrictEqual({ event: 'view' });
  });
});
