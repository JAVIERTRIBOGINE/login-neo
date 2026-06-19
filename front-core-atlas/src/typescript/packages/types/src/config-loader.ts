import type { AuthConfig } from './authorization-utils.js';
import type { InitEventResponsePayload } from './bridge-events.js';
import type { IDataManagerDriver } from './data-manager-drivers.js';
import type { AuthorizationTokens, AvailableDrivers } from './data-manager.js';
import type { I18nConfiguration } from './i18n-utils.js';
import type { LoggerLevel } from './logger-utils.js';
import type { TM_AVAILABLE_DRIVERS } from './tag-manager-drivers.js';
import type { ITagManagerDriver } from './tag-manager.js';
import type { CMSHeadlessConfig } from './cms-headless.js';
/**
 * Main App config structure
 */
type AppConfig = {
  NAME: string;
  VERSION: string;
  DEFAULT_LOCALE: string;
};

/**
 * Main Rest App config structure
 */
export type APIConfig = {
  HOST: string;
  BASE_PATH: string;
  REQUEST_TIMEOUT?: number;
  DRIVER: AvailableDrivers;
  HAS_CUSTOM_ERROR?: boolean;
  TRANSLATE_ALL_ERRORS?: boolean;
  INTERCEPTORS?: APIInterceptor[];
};

export type APIInterceptor = {
  CODE: number;
  EVENT: string;
  REPEAT?: boolean;
  ERROR_TRANSLATE?: boolean;
};

export type DataManagerConfig = Record<string, APIConfig>;

/**
 * Main Logging config structure
 */
type LoggingConfig = {
  LOG_LEVEL: LoggerLevel;
  API_ENABLED: boolean;
  API_LOG_LEVEL: LoggerLevel;
  API_FW_LOG_LEVEL: LoggerLevel;
  /**
   * @deprecated use DATAMANAGER_CORE and DATAMANAGER_APP instead
   */
  API_ENDPOINT?: string;
  DATAMANAGER_CORE?: string; // @TODO: replace by keyof BaseConfig['DATAMANAGER_CONFIG'];
  DATAMANAGER_APP?: string; // @TODO: replace by keyof BaseConfig['DATAMANAGER_CONFIG'];
};

export enum MaintenanceCause {
  all_services_down = 'all_services_down',
  all_services_maintenance = 'all_services_maintenance',
  bso_maintenance = 'bso_maintenance',
  bso_down = 'bso_down',
  bsm_maintenance = 'bsm_maintenance',
  bsm_down = 'bsm_down'
}
/**
 * Maintenance config structure
 */
type MaintenanceConfig = {
  TYPE: 'local' | 'remote';
  ENABLED: boolean;
  CAUSE: MaintenanceCause;
  URL?: string;
  ROUTES?: MaintenanceRoute[];
  HOST?: Location['host'];
};

/**
 * Maintenance Route structure
 */
export type MaintenanceRoute = {
  ID: string;
  URL: string;
  ENABLED: boolean;
};

/**
 * Keep Alive configuration
 */
type KeepAliveConfig = {
  REFRESH_TIMER?: number;
};

/**
 * Event Manager configuration
 */
export type EventManagerConfig = {
  TIMEOUT?: number;
  UNIQUE_EVENTS?: string[];
};

export type TagManagerConfig = {
  AUTO_TRACE_DISABLED?: boolean;
  AUTO_TRACE_EXPERIENCE_DISABLED?: boolean;
  DRIVERS: TagDriverConfig[];
};

export type TagDriverConfig = {
  DRIVER: TM_AVAILABLE_DRIVERS;
  CLASS?: string[];
};

/**
 * Main connection resource info
 */
type BaseResourceInfo = {
  HOST?: string;
  BASE_PATH?: string;
  CONFIG_BASE_PATH?: string;
};

/**
 * Microfrontend information for loading into App Shell
 */
export type MicrofrontendMetadata = BaseResourceInfo & {
  ID: string;
};

/**
 * Basic config for all P4 elements which has configurations
 */
export interface BaseConfig {
  APP_CONFIG: AppConfig;
  I18N_CONFIG?: I18nConfiguration;
  DATAMANAGER_CONFIG?: Record<string, APIConfig>;
  LOGGING_CONFIG?: LoggingConfig;
  MAINTENANCE_CONFIG: MaintenanceConfig;
}

/**
 * Basic App Config structure, mandatory to all app configurations
 */
export type BaseAppConfig = BaseConfig & {
  DATAMANAGER_CONFIG: DataManagerConfig;
  AUTH_CONFIG?: AuthConfig;
  CONFIG_VERSION: string;
  TAG_MANAGER_CONFIG?: TagManagerConfig;
  INIT_DATA?: InitEventResponsePayload;
  KEEP_ALIVE_CONFIG?: KeepAliveConfig;
  EVENT_CONFIG?: EventManagerConfig;
  COOKIES_MANAGER_CONFIG?: CookiesManagerConfig;
  FRAUD_CONFIG?: FraudConfig;
  CMS_HEADLESS_CONFIG?: CMSHeadlessConfig;
  DYNATRACE_CONFIG?: DynatraceConfig;
  TRANSLATE_ERROR_CONFIG?: TranslateErrorConfig;
};

/**
 * Basic App config structure, mandatory to all Apps
 */
export type CoreAppConfig = BaseAppConfig & {
  APP_EVENTS: string[];
};

/**
 * Basic App Shell config structure, mandatory to all App Shell/Portals
 */
export type CoreShellConfig = BaseAppConfig & {
  BRIDGE_EVENTS: string[];
  BRIDGE_BROADCAST_EVENTS?: string[];
  MICROFRONTEND_METADATA: MicrofrontendMetadata[];
};

/**
 * Basic Standalone App config structure, mandatory to all Standalone Apps
 */
export type CoreBrowserConfig = CoreShellConfig & CoreAppConfig;

/**
 * Common configuration between micro frontends
 */
export type CoreMfeCommonConfig = {
  /**
   * Shared language between micro frontend
   */
  language: string;

  /**
   * Base path between micro frontend
   */
  basePath: string;

  /**
   * Authentication information between micro frontend
   */
  auth?: AuthorizationTokens;
};

/**
 * Shared data sent at micro frontend initialization
 */
export type CoreShellSharedConfig = {
  /**
   * Portal static configuration (env.json)
   */
  portalConfig: CoreShellConfig;

  /**
   * Common configuration between micro frontend
   */
  commonMfeConfig: CoreMfeCommonConfig;

  /**
   * Custom configuration for a micro frontend
   */
  customMfeConfig?: unknown;
};

/**
 * Interface for Config Loader definition.
 * Expose different method for retrieving the global configs files
 */
export interface IConfigLoader<T extends BaseConfig> {
  retrieveAllGlobalConfig: () => Promise<T>;
}

/**
 * Basic Loader configuration
 */
export type LoaderConf = BaseResourceInfo & {
  CONFIG_FILE_NAMES?: string[];
};

/**
 * Bootstrap drivers
 */
export interface BootstrapDrivers {
  httpDriver?: IDataManagerDriver;
  tagManagerDriver?: ITagManagerDriver;
}

/**
 * Cookies Manager Config
 */
export type CookiesManagerConfig = {
  ACTIVATED: boolean;
};

/**
 * Config for the fraud utilities
 */
export type FraudConfig = {
  /**
   * Config for RSA
   */
  RSA: RsaConfig;
  /**
   * Config for BioCatch
   */
  BIOCATCH: BioCatchConfig;
};

/**
 * Config for the dynatrace utilities
 */
export type DynatraceConfig = {
  /**
   * Boolean indicating if needs to be active or not
   */
  ACTIVATED: boolean;
};

/**
 * Values for the RSA fraud config
 */
type RsaConfig = {
  /**
   * Boolean indicating if needs to be active or not
   */
  ACTIVATED: boolean;
};

/**
 * Values for the BioCatch fraud config
 */
type BioCatchConfig = {
  /**
   * Boolean indicating if needs to be active or not
   */
  ACTIVATED: boolean;
};

/**
 * Values for the Translate Errorconfig
 */
export type TranslateErrorConfig = {
  /**
   * Boolean indicating if needs to be active or not
   */
  DATA_MANAGER: string;
};
