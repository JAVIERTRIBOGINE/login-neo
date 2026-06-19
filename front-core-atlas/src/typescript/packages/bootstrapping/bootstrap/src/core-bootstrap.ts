import { AmountUtils } from '@proteo/amount-utils';
import { extractUserInfoFromToken } from '@proteo/authorization-utils';
import { initializeBioCatch, initializeBioCatchBSO } from '@proteo/biocatch-util';
import { BS_COOKIE_DOMAIN, DEFAULT_COOKIE_PATH, setCookie } from '@proteo/cookie-utils';
import { initializeCookiesPolicy } from '@proteo/cookies-policy-utils';
import { initialize as initializeDataManager } from '@proteo/data-manager';
import { DateUtils } from '@proteo/date-utils';
import { initializeDynatrace } from '@proteo/dynatrace-utils';
import { EventManager } from '@proteo/event-bus';
import { I18n, I18nLangLoader, Languages } from '@proteo/i18n-utils';
import { KeepAlive } from '@proteo/keep-alive';
import { LoggerUtils } from '@proteo/logger-utils';
import { checkMaintenanceConfig } from '@proteo/maintenance-loader';
import { isFullProteo, isNative, isWebContainer } from '@proteo/platform-utils';
import { initializeRSA } from '@proteo/rsa-util';
import { StorageManager } from '@proteo/storage-utils';
import { OPTANON_COOKIE, TagManager } from '@proteo/tag-manager';
import type {
  BaseAppConfig,
  ConsentsEventPayload,
  ContextChangedData,
  DeeplinkData,
  EventPayload,
  LoginAccessTypeEventResponse,
  TagDriverConfig,
  TagManagerConfiguration,
  UserInfoEventResponse,
  UserInfoResponse
} from '@proteo/types';
import { TM_AVAILABLE_DRIVERS_CLASS } from './constants.js';

/**
 * Class for Proteo4 Core initialization.
 */
export class CoreBootstrap {
  /**
   * Initialize the whole proteo4 core singleton instances with the given configuration
   * @param config The app configuration
   * @param drivers a process object with the drivers that should be necessary to bootstrap the proteo4 utilities
   */
  public static async initialize(config?: BaseAppConfig) {
    if (!config) return;
    // Logger configuration
    if (config.LOGGING_CONFIG) {
      const loggerConfig = {
        name: config.APP_CONFIG.NAME,
        level: config.LOGGING_CONFIG.LOG_LEVEL,
        remote: {}
      };
      // Update logger config if for remote logger
      if (config.LOGGING_CONFIG.API_ENABLED) {
        loggerConfig.remote = {
          level: config.LOGGING_CONFIG.API_LOG_LEVEL
        };
      }
      LoggerUtils.initInstance(loggerConfig);
    }

    if (config.TRANSLATE_ERROR_CONFIG) {
      window.BsTranslateErrorDriver = config.TRANSLATE_ERROR_CONFIG.DATA_MANAGER;
    }

    // Check maintenance mode
    checkMaintenanceConfig(config);

    StorageManager.initInstance();

    const i18nConf = Languages[new I18nLangLoader().loadLocale(config.APP_CONFIG.DEFAULT_LOCALE)];
    await I18n.initInstance(i18nConf);

    // Init this utils before initialize i18n utils for catch I18n.use() event
    AmountUtils.initInstance(i18nConf);
    DateUtils.initInstance(i18nConf);

    KeepAlive.initInstance();

    await initializeDataManager(config.DATAMANAGER_CONFIG);

    EventManager.initInstance(config.APP_CONFIG.NAME, config.APP_CONFIG.VERSION, config.EVENT_CONFIG);

    CoreBootstrap.initializeTagManager(config, true);

    this.eventManagement(config);

    if (isFullProteo()) {
      this.fullProteoInitialize(config);
    } else if (isNative()) {
      this.nativeInitialize(config);
    } else if (isWebContainer()) {
      initializeBioCatchBSO(config)
        .then(() => this.remoteDebug('[Core Bootstrap] initializeBioCatchBSO initialized correctly in BSO scenario'))
        .catch(() => this.remoteDebug('[Core Bootstrap] Error in catch from initializeBioCatchBSO in BSO scenario'));
      CoreBootstrap.initializeTagManager(config);
    } else {
      CoreBootstrap.initializeTagManager(config);
    }

    if (config.DYNATRACE_CONFIG) {
      initializeDynatrace(config)
        .then(() => this.remoteDebug('[Core Bootstrap] initializeDynatrace initialized correctly'))
        .catch(() => this.remoteDebug('[Core Bootstrap] Error in catch from initializeDynatrace'));
    }
  }

  private static fullProteoInitialize(config: BaseAppConfig): void {
    if (!config.COOKIES_MANAGER_CONFIG) {
      CoreBootstrap.initializeTagManager(config);
    }
    initializeCookiesPolicy(config)
      .then(() =>
        this.remoteDebug('[Core Bootstrap] initializeCookiesPolicy initialized correctly in FullProteo scenario')
      )
      .catch(() =>
        this.remoteDebug('[Core Bootstrap] Error in catch from initializeCookiesPolicy in FullProteo scenario')
      );
    initializeRSA(config)
      .then(() => this.remoteDebug('[Core Bootstrap] initializeRSA initialized correctly in FullProteo scenario'))
      .catch(() => this.remoteDebug('[Core Bootstrap] Error in catch from initializeRSA in FullProteo scenario'));
    initializeBioCatch(config)
      .then(() => this.remoteDebug('[Core Bootstrap] initializeBioCatch initialized correctly in FullProteo scenario'))
      .catch(() => this.remoteDebug('[Core Bootstrap] Error in catch from initializeBioCatch in FullProteo scenario'));
  }

  private static nativeInitialize(config: BaseAppConfig): void {
    EventManager.getInstance().subscribe('BROADCAST_OPTANON_CONSENT', async (_msg, payload: ConsentsEventPayload) => {
      const { consentedDate, data, groups } = payload;
      const consents = `datestamp=<${consentedDate}>&version=<${data.version}>&appId=<${data.appID}>&groups=<${groups}>`;
      const OPTANON_CONSENTS_EXPIRATION_DAYS = 30;
      setCookie(OPTANON_COOKIE, consents, OPTANON_CONSENTS_EXPIRATION_DAYS, DEFAULT_COOKIE_PATH, BS_COOKIE_DOMAIN);
      TagManager.manageCookieConsents();
    });
    EventManager.getInstance().subscribe(
      'BROADCAST_USER_INFO',
      async (_msg: string, payload: UserInfoEventResponse) => {
        try {
          const encodedUserInfo: string = payload.userInfo;
          const userInfo: UserInfoResponse = extractUserInfoFromToken(encodedUserInfo);
          TagManager.getInstance().setNumPersona(userInfo.numpersona);
        } catch (error) {
          LoggerUtils.getInstance().error(`[CoreBootstrap] User info parse error: ${error}`, {
            remoteLogger: true,
            type: 'application'
          });
        }
      }
    );
    EventManager.getInstance().subscribe(
      'BROADCAST_LOGIN_ACCESS_TYPE',
      async (_msg: string, payload: LoginAccessTypeEventResponse) => {
        TagManager.getInstance().setLoginAccessType(payload.acceso);
      }
    );
    initializeBioCatch(config)
      .then(() => this.remoteDebug('[Core Bootstrap] initializeBioCatch initialized correctly in native scenario'))
      .catch(() => this.remoteDebug('[Core Bootstrap] Error in catch from initializeBioCatch in native scenario'));
    CoreBootstrap.initializeTagManager(config);
  }

  private static eventManagement(config: BaseAppConfig): void {
    const disableAutoTrace = config.TAG_MANAGER_CONFIG?.AUTO_TRACE_DISABLED;
    const disableAutoTraceExperience = config.TAG_MANAGER_CONFIG?.AUTO_TRACE_EXPERIENCE_DISABLED;
    if (!disableAutoTrace || !disableAutoTraceExperience) {
      EventManager.getInstance().subscribe('CONTEXT_CHANGED', async (_msg, payload) => {
        const data = {
          data: {
            event: 'page_view_auto',
            pageInfo: {
              screenName: (payload as EventPayload<ContextChangedData>).data.pageName
            }
          }
        };
        if (!disableAutoTrace) {
          TagManager.getInstance().trace(data);
        }
        if (!disableAutoTraceExperience) {
          TagManager.getInstance().traceExperience(data);
        }
      });
    }

    EventManager.getInstance().subscribe('CORE_DEEPLINK', async (_msg: string, payload) => {
      const deeplink = (payload as EventPayload<DeeplinkData>).data.deeplink;
      TagManager.getInstance().setDeepLink(deeplink);
    });
  }

  // Tag manager initialization
  static initializeTagManager(config: BaseAppConfig, earlyMode?: boolean): void {
    this.remoteDebug('[Core Bootstrap] initializing Tag Manager');
    if (config.TAG_MANAGER_CONFIG) {
      const tagManagerConf: Record<string, TagManagerConfiguration> = {};
      config.TAG_MANAGER_CONFIG?.DRIVERS.forEach((driverConfig: TagDriverConfig) => {
        if (driverConfig.DRIVER) {
          tagManagerConf[driverConfig.DRIVER] = {
            driver: TM_AVAILABLE_DRIVERS_CLASS[driverConfig.DRIVER],
            class: driverConfig.CLASS || []
          };
        }
      });
      TagManager.initInstance(tagManagerConf, earlyMode);
    }
  }

  private static remoteDebug(message: string) {
    LoggerUtils.getInstance().debug(message, {
      remoteLogger: true,
      type: 'application'
    });
  }
}
