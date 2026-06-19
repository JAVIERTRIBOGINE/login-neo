import { BS_COOKIE_DOMAIN, DEFAULT_COOKIE_PATH, getCookie, removeCookie } from '@proteo/cookie-utils';
import { EventManager } from '@proteo/event-bus';
import { LoggerUtils } from '@proteo/logger-utils';
import { isNative } from '@proteo/platform-utils';
import { TealiumTxP4Driver } from '@proteo/tag-manager-driver-tealium-tx-p4';
import type {
  DataLayerTXP4,
  ITagManagerDriver,
  TM_AVAILABLE_DRIVERS,
  TagManagerConfiguration,
  TagRequest,
  TagResponse
} from '@proteo/types';

export const OPTANON_COOKIE = 'OptanonConsent';

/**
 * Manage Tag Driver initialization and exposes it
 */
export class TagManager {
  /**
   * Driver instancess
   */
  private readonly _driversMap = new Map<string, ITagManagerDriver>();

  /**
   * Early mode for event pooling
   */
  private earlyMode = false;

  /**
   * Trace event pool
   */
  private tracePool: TagRequest<unknown>[] = [];

  /**
   * OneTrust consents
   */
  private consents = '';

  /**
   * Constructor for class
   */
  private constructor(conf?: Record<string, TagManagerConfiguration>, earlyMode?: boolean) {
    if (!earlyMode) {
      this.initializeDrivers(conf).then(() => {
        this.manageInstanceCookieConsents();
      });
    }
  }

  private initializeDrivers(conf?: Record<string, TagManagerConfiguration>): Promise<unknown> {
    const promises = [];
    if (conf && Object.keys(conf).length > 0) {
      for (const tag in conf) {
        const config = conf[tag];
        if (config.driver) {
          config.driver.setup({ class: config?.class });
          promises.push(this._driversMap.set(tag, config.driver));
        } else {
          LoggerUtils.getInstance().debug(
            '[TagManager] no driver passed to the configuration. Applying default driver: TealiumTxP4Driver',
            {
              remoteLogger: true,
              type: 'application'
            }
          );
          const defaultDriver = new TealiumTxP4Driver(config);
          defaultDriver.setup({ class: config?.class });
          promises.push(this._driversMap.set(tag, defaultDriver));
        }
      }
    } else {
      LoggerUtils.getInstance().debug(
        '[TagManager] no configuration passed. Applying default driver: TealiumTxP4Driver',
        {
          remoteLogger: true,
          type: 'application'
        }
      );
      const defaultDriver = new TealiumTxP4Driver();
      defaultDriver.setup({ class: [] });
      promises.push(this._driversMap.set('TXP4', defaultDriver));
    }
    return Promise.allSettled(promises);
  }

  public static manageCookieConsents() {
    const tagManagerInstance = TagManager.getInstance();
    if (tagManagerInstance) {
      tagManagerInstance.manageInstanceCookieConsents();
    }
  }

  public manageInstanceCookieConsents() {
    const CONSENTS_INDEX = 7;
    const consentCookie = getCookie(OPTANON_COOKIE);
    if (consentCookie) {
      try {
        this.setConsents(
          consentCookie
            .split('&')
            .filter((value) => value.startsWith('groups='))[0]
            .substring(CONSENTS_INDEX)
        );
      } catch {
        LoggerUtils.getInstance().error(`[TagManager] Wrong consent cookie format: ${consentCookie}`, {
          remoteLogger: true,
          type: 'application'
        });
      }
    }
  }

  /**
   * Initialize the proteo tag manager with its configuration
   * @param conf the tag manager configuration
   */
  public static initInstance(conf?: Record<string, TagManagerConfiguration>, earlyMode?: boolean): void {
    if (!window.BsTagManager) {
      window.BsTagManager = new TagManager(conf, earlyMode);
    }
    window.BsTagManager.setEarlyMode(!!earlyMode, conf);
    if (!earlyMode && window._tempBSMAnalytics) {
      TagManager.storeBSMAnalyticsData(window._tempBSMAnalytics);
      window._tempBSMAnalytics = undefined;
    }
  }

  public setEarlyMode(earlyMode: boolean, conf?: Record<string, TagManagerConfiguration>) {
    if (this.earlyMode && !earlyMode) {
      this.earlyMode = earlyMode;
      this.initializeDrivers(conf).then(() => {
        this.manageInstanceCookieConsents();
      });
    } else {
      this.earlyMode = earlyMode;
    }
  }

  public setConsents(consents: string) {
    this.consents = consents;
    const consentsObject = { globalInfo: { consentCategories: consents } };
    TagManager.setTXP4TempAnalyticsData(consentsObject);
    if (!this.earlyMode) {
      this.resolveTracePool();
    }
  }

  public clearConsents(showBanner = false) {
    removeCookie(OPTANON_COOKIE, DEFAULT_COOKIE_PATH, BS_COOKIE_DOMAIN);
    this.consents = '';

    const driver = TagManager.getInstance()?.getDriver('TXP4');
    if (driver) {
      (driver as TealiumTxP4Driver)?.flushDataLayer();
    }

    if (isNative()) {
      EventManager.getInstance().publish('CLEAR_OPTANON_CONSENTS', { method: 'clearConsents', data: {} });
      if (showBanner) {
        EventManager.getInstance().publish('SHOW_BANNER_CONSENT', { method: 'showBannerConsent', data: {} });
      }
    }
  }

  public setNumPersona(numpersona: string) {
    const numperObject: Partial<DataLayerTXP4> = { userInfo: { numper: numpersona } };
    TagManager.setTXP4TempAnalyticsData(numperObject);
  }

  public setLoginAccessType(type: string) {
    const loginAccessTypeObject: Partial<DataLayerTXP4> = { globalInfo: { acceso: type } };
    TagManager.setTXP4TempAnalyticsData(loginAccessTypeObject);
  }

  public setDeepLink(deeplinkUrl: string) {
    const deepLinkObject = {
      eventInfo: {
        deeplink: {
          deep_link_url: deeplinkUrl,
          deep_link_origin: 'universal-link'
        }
      }
    };
    TagManager.setTXP4TempAnalyticsData(deepLinkObject);
  }

  public static setTXP4TempAnalyticsData(dataObject: Record<string, unknown>) {
    try {
      const driver = TagManager.getInstance()?.getDriver('TXP4');
      (driver as TealiumTxP4Driver).setBSMAnalyticsData(dataObject);
    } catch {
      this.setWindowTempAnalyticsData(dataObject);
    }
  }

  private static setWindowTempAnalyticsData(dataObject: Record<string, unknown>) {
    if (window._tempBSMAnalytics) {
      window._tempBSMAnalytics = { ...window._tempBSMAnalytics, ...dataObject };
    } else {
      window._tempBSMAnalytics = dataObject;
    }
  }

  private resolveTracePool<T extends Record<string, unknown>>() {
    this.tracePool.forEach((tagRequest) => {
      this.trace<T>(tagRequest as TagRequest<T>);
    });
    this.tracePool = [];
  }

  /**
   * Returns the instance class of TagManager
   * @returns {TagManager} tag manager instance
   */
  public static getInstance(): TagManager {
    // NOTE: Special case for tag manager. This component is introduced into proteo utils
    // since this component only need to be init into mfe, we are going to manage it's
    // creating into app bootstrap using the initInstance method
    return window.BsTagManager;
  }

  /**
   * Returns a specific Driver instance
   * @returns {ITagManagerDriver} driver instance
   */
  public getDriver(type: TM_AVAILABLE_DRIVERS): ITagManagerDriver {
    const driverToReturn = this._driversMap.get(type);
    if (!driverToReturn) {
      LoggerUtils.getInstance().warn('[TagManager] No driver exists with the requested type', {
        remoteLogger: true,
        type: 'application'
      });
      throw new Error('[TagManager] No driver exists with the requested type');
    }
    return driverToReturn;
  }

  /**
   * The function adapt the data to Tealium.
   * @param key driver type
   * @param tagRequest driver tag
   * @returns {tagRequest} tag formatted
   */
  public adaptTagRequest<T extends Record<string, unknown>>(
    key: TM_AVAILABLE_DRIVERS,
    tagRequest: TagRequest<T>
  ): TagRequest<T> {
    const tagData = tagRequest.data;
    if (tagData) {
      const isFlat = !Object.keys(tagData).some(
        (tagKey) => typeof tagData[tagKey] === 'object' && tagData[tagKey] !== null && !Array.isArray(tagData[tagKey])
      );

      if (key !== 'TXP4' && !isFlat) {
        tagRequest.data = this.convertToTealium(tagRequest.data);
      }
      return tagRequest;
    } else {
      return tagRequest;
    }
  }

  /**
   * The function adapt the data to the different drivers.
   * @param obj no flattened object
   * @param parentKey default parent
   * @param separator default separator
   * @returns {tagRequest} tag formatted
   */
  private convertToTealium<T extends Record<string, unknown>>(
    obj: Record<string, unknown>,
    parentKey = '',
    separator = '.'
  ): T {
    return Object.keys(obj).reduce((acc: Record<string, unknown>, key) => {
      const fullKey = parentKey ? `${parentKey}${separator}${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(acc, this.convertToTealium(obj[key] as Record<string, unknown>, fullKey, separator));
      } else {
        acc[fullKey] = obj[key];
      }
      return acc;
    }, {} as T) as T;
  }

  /**
   * The function send the data object to remote server.
   * @param tagRequest tag request information
   * @returns {Promise<TagResponse<T>>} tag response
   */
  public trace<T extends Record<string, unknown>>(tagRequest: TagRequest<T>): Map<string, Promise<TagResponse<T>>> {
    if (!tagRequest.data) {
      LoggerUtils.getInstance().warn('[TagManager] Wrong TagRequest structure', {
        remoteLogger: true,
        type: 'application'
      });
    }
    if (this.earlyMode || !this.consents) {
      this.tracePool.push(tagRequest);
      if (!this.consents) {
        TagManager.manageCookieConsents();
      }
      return new Map();
    }
    return new Map(
      Array.from(this._driversMap, ([key, value]) => {
        const tagData = this.adaptTagRequest(key as TM_AVAILABLE_DRIVERS, tagRequest);
        return [key, value.trace(tagData)];
      })
    );
  }

  /**
   * The function send the data object to remote experience server.
   * @param tagRequest tag request information
   * @returns {Promise<TagResponse<T>>} tag response
   */
  public traceExperience<T>(tagRequest: TagRequest<T>): Promise<TagResponse<unknown>> {
    if (!tagRequest.data) {
      LoggerUtils.getInstance().warn('[TagManager] Wrong TagRequest structure', {
        remoteLogger: true,
        type: 'application'
      });
    }
    if (this.earlyMode || !this.consents) {
      if (!this.consents) {
        TagManager.manageCookieConsents();
      }
      return Promise.resolve({ data: {} as T });
    }
    const tagDriver = this._driversMap.get('TXP4');
    if (tagDriver) {
      return tagDriver.traceExperience(tagRequest);
    } else {
      LoggerUtils.getInstance().warn('[TagManager] No TXP4 driver set, traceExperience could not be sent', {
        remoteLogger: true,
        type: 'application'
      });
      return Promise.resolve({ data: {} as T });
    }
  }

  /**
   * Stores analytics data into TXP4 DataLayer or stores it as temp for later.
   * @param analytics analytics information
   */
  public static storeBSMAnalyticsData(analytics: Partial<DataLayerTXP4>) {
    if (window.BsTagManager) {
      try {
        const driver = TagManager.getInstance().getDriver('TXP4');
        (driver as TealiumTxP4Driver).setBSMAnalyticsData(analytics);
      } catch {
        LoggerUtils.getInstance().warn('[TagManager] BSM Analytics data could not be stored, missing proper driver', {
          remoteLogger: true,
          type: 'application'
        });
      }
    } else {
      TagManager.setTXP4TempAnalyticsData(analytics);
    }
  }
}
