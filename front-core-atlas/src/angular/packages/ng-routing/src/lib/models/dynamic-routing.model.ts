import { Routes } from '@angular/router';
import { InitEventResponsePayload } from '@proteo/types';
export interface NgProteoBootstrapConfig {
  ROOT_PATH?: string;
  ERROR_PATH?: string;
  FEATURE_MANAGER?: BsApplicationFMConfig;
}

/**
 * Configuration for Dynamic Routing.
 */
export interface DynamicRoutingConfig {
  /**
   * Set static routes in the local application.
   */
  staticRoutes: Routes;

  /**
   * Set feature manager object (in string) with information necessary for generating routes.
   */
  dynamicRoutes: BsApplicationList;

  /**
   * Set the root path for starting to generate all routes from the remote config (Feature Manager) if a custom path is necessary.
   */
  rootPath?: string;

  /**
   * Set the error route path for redirection if the MFE (Micro Frontend) is not available.
   */
  errorRoutePath?: string;

  /**
   * Set use Feature Manager for change routes.
   */
  featureManager?: boolean;
}

/**
 * Bootstrap configuration for Dynamic Routing.
 */
export type BootstrapDynamicRouting = Partial<DynamicRoutingConfig> & {
  staticRoutes: Routes;
};

/**
 * Status of the remote resource.
 */
export enum RemoteStatus {
  'NOT_AVAILABLE' = 'NOT_AVAILABLE',
  'AVAILABLE' = 'AVAILABLE',
  'ERROR_LOAD' = 'ERROR_LOAD',
  'LOAD' = 'LOAD'
}

/**
 * Type of the BancSabadell application.
 */
export enum BsApplicationType {
  'P4_MFE' = 'P4_MFE',
  'P4_MFE_LEGACY' = 'P4_MFE_LEGACY'
}

/**
 * Represents a BancSabadell application.
 */
export interface BsApplication {
  /**
   * The ID of the application.
   */
  appId: string;

  /**
   * The type of the application.
   */
  type: 'P4_MFE' | 'P4_MFE_LEGACY' | 'NATIVE' | 'MAINTENANCE';

  /**
   * The route configuration for the application.
   */
  routeConfig: BsMicrofrontend | BsMicrofrontendLegacy;

  /**
   * The payload of the application.
   */
  payload: any;

  /**
   * The app native config of the application.
   */
  appConfig?: {
    mode?: 'root' | 'navigation' | 'fullscreen' | 'popover';
  };

  /**
   * The maintenance mode activated.
   */
  maintenance?: string;
}

export interface FeatureManagerProject {
  KEY: string;
}

export interface BsApplicationFMConfig {
  RELEASE_PROJECT: FeatureManagerProject;
  MAIN_PROJECT: FeatureManagerProject;
  CONTEXT?: {
    [key: string]: string;
  };
}

/**
 * Represents a list of BancSabadell applications.
 */
export interface BsApplicationList {
  [key: string]: BsApplication;
}

/**
 * Represents a micro frontend in the BancSabadell application.
 */
export interface BsMicrofrontend {
  /**
   * The remote entry file for the micro frontend.
   */
  remoteEntry: string;

  /**
   * The route path for the micro frontend.
   */
  routePath: string;

  /**
   * The exposed module of the micro frontend.
   */
  exposedModule: string;

  /**
   * The name of the module.
   */
  nameModule: string;

  /**
   * Check authenticate route.
   */
  isAuthenticate?: boolean;

  /**
   * Check piloting mode.
   */
  isPiloting?: boolean;
}

/**
 * Represents a legacy micro frontend in the BancSabadell application.
 */
export interface BsMicrofrontendLegacy {
  /**
   * The URL of the legacy micro frontend.
   */
  url: string;

  /**
   * The route path for the legacy micro frontend.
   */
  routePath: string;

  /**
   * Check authenticate route.
   */
  isAuthenticate?: boolean;

  /**
   * Check piloting mode.
   */
  isPiloting?: boolean;
}

/**
 * Represents a federated component in the BancSabadell application.
 */
export interface BsComponentFederated {
  /**
   * The remote entry file for the federated component.
   */
  remoteEntry: string;

  /**
   * The exposed module of the federated component.
   */
  exposedModule: string;
}

/**
 * Configuration object for generating dynamic routes.
 */
export interface BsGenerateRoutesConfig {
  /**
   * List of applications to be included in the routing configuration.
   */
  applications: BsApplicationList;

  /**
   * Path to the error route, used as a fallback in case of navigation errors.
   */
  errorRoutePath: string;

  /**
   * Paths to the auths routes.
   */
  auth: BSauthRoutesConfig;

  /**
   * Universal Links Mapping routes.
   */
  ulMapping: BSulMappingConfig;

  /**
   * The root path of the application where the routing starts.
   */
  rootPath: string;

  /**
   * Flag to enable or disable the feature manager.
   */
  featureManager: BsApplicationFMConfig;

  /**
   * Init data to be used in the routing configuration.
   */
  initData: InitEventResponsePayload;
}

/**
 * Configuration object for generating auth routes.
 */
export interface BSauthRoutesConfig {
  LOGIN_PATH: string;
}

/**
 * Response of checkAuth native event.
 */
export interface CheckAuthResponse {
  status: boolean;

}
/**
 * Response of WEB_NAVIGATION event.
 */
export interface WebNavigationEventResponse {
  path: string;
}

/**
 * Configuration object for generating auth routes.
 */
export interface BSulMappingConfig {
  [key: string]: string;
}
