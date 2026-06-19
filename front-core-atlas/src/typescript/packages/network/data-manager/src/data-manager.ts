/* eslint-disable @typescript-eslint/no-unused-vars */
import type { DataManagerDriver } from '@proteo/data-manager-driver';
import type { Proteo4Driver } from '@proteo/data-manager-driver-proteo4';
import { LoggerUtils } from '@proteo/logger-utils';
import type {
  APIConfig,
  AuthorizationTokens,
  AvailableDrivers,
  DriverConfiguration,
  DataManagerConfig,
  DriverInterceptor,
  DataManagerRequestContainer,
  DataManagerResponse,
  DataManagerResponseError
} from '@proteo/types';
import { AVAILABLE_DRIVERS_CLASS, DATAMANAGER_CONFIG_DEFAULT_NAME } from './constants.js';
import { repeatRequestError } from '@proteo/data-manager-utils';

/**
 * Check if object provided as parameter is APIConfig or an APIConfig Map
 *
 * @param {DataManagerConfig} config
 * @returns {boolean} config is APIConf type or not
 */

const getInstanceData = (name: string, config: APIConfig) => {
  const interceptors: DriverInterceptor[] = [];
  config.INTERCEPTORS?.forEach((interceptor) => {
    const { CODE: code, EVENT: event, REPEAT: repeat, ERROR_TRANSLATE: errorTranslate } = interceptor;
    interceptors.push({ code, event, repeat, errorTranslate });
  });
  const {
    DRIVER,
    HOST: host,
    BASE_PATH: baseUrl,
    HAS_CUSTOM_ERROR: hasCustomError = false,
    TRANSLATE_ALL_ERRORS: translateAllErrors = false,
    REQUEST_TIMEOUT: requestTimeout
  } = config;
  const driverConfig: DriverConfiguration = {
    name,
    host,
    baseUrl,
    hasCustomError,
    translateAllErrors,
    requestTimeout,
    interceptors
  };
  return { driver: DRIVER, config: driverConfig };
};

const createDataManagerDriver = async (
  name: string,
  { driver, config }: { driver: AvailableDrivers; config: DriverConfiguration }
) => {
  const driverInstance = await AVAILABLE_DRIVERS_CLASS[driver](config);
  window.BsDataManager.driversMap.set(name, driverInstance);
};

const checkInstanceExits = (name: string) => {
  if (!name) {
    LoggerUtils.getInstance().error(`[DataManager] Missing param "name"`, { remoteLogger: true, type: 'application' });
    return false;
  }
  if (!hasDriver(name)) {
    LoggerUtils.getInstance().error(`[DataManager] Data manager with name "${name}" don't found`, {
      remoteLogger: true,
      type: 'application'
    });
    return false;
  }
  return true;
};

function processRemainingDrivers(driverType: AvailableDrivers) {
  const driver = window.BsDataManager.driversMap.get(driverType);
  const pendingConfigs = window.BsDataManager.pendingConfigsMap.get(driverType);
  if (driver && pendingConfigs) {
    pendingConfigs.forEach((pendingConfig) => {
      (driver as DataManagerDriver).addAPI(pendingConfig);
    });
  }
}

export const initialize = async (config: DataManagerConfig) => {
  if (!window.BsDataManager?.driversMap) {
    window.BsDataManager = {
      driversMap: new Map<string, DataManagerDriver | Proteo4Driver>(),
      pendingConfigsMap: new Map<string, DriverConfiguration[]>()
    };
  }

  if (!config || Object.keys(config).length === 0) {
    const message = '[DataManager] A config is needed to initialize the Data Manager';
    LoggerUtils.getInstance().error(message, {
      remoteLogger: true,
      type: 'application'
    });
    throw new Error(message);
  }
  const promises = new Map();
  const promisesTillFinish = [];
  for (const name in config) {
    const apiConfig = config[name];
    const driverType = apiConfig.DRIVER;
    if (window.BsDataManager.driversMap.has(driverType)) {
      (window.BsDataManager.driversMap.get(driverType) as DataManagerDriver).addAPI(
        getInstanceData(name, apiConfig).config
      );
    } else if (promises.has(driverType)) {
      if (window.BsDataManager.pendingConfigsMap.has(driverType)) {
        (window.BsDataManager.pendingConfigsMap.get(driverType) as DriverConfiguration[]).push(
          getInstanceData(name, apiConfig).config
        );
      } else {
        window.BsDataManager.pendingConfigsMap.set(driverType, [getInstanceData(name, apiConfig).config]);
      }
    } else {
      promises.set(driverType, createDataManagerDriver(driverType, getInstanceData(name, apiConfig)));
      promisesTillFinish.push(promises.get(driverType));
      promises.get(driverType).then(() => {
        processRemainingDrivers(driverType);
      });
    }
  }
  return Promise.allSettled(promisesTillFinish);
};

export const hasDriver = (name: string) => {
  let driverFound = false;
  window.BsDataManager.driversMap.forEach((driver) => {
    driverFound = driverFound || driver.hasDriverConfig(name);
  });
  return driverFound;
};

export const getDriver = (name = DATAMANAGER_CONFIG_DEFAULT_NAME): DataManagerDriver | undefined => {
  let driverFound;
  checkInstanceExits(name);
  window.BsDataManager.driversMap.forEach((driver) => {
    if (driver.hasDriverConfig(name)) {
      driver.setupByName(name);
      driverFound = driver;
    }
  });
  return driverFound;
};

export const deleteDriver = (name: string) => {
  if (checkInstanceExits(name)) {
    window.BsDataManager.driversMap.forEach((driver, key) => {
      if (driver.hasDriverConfig(name) && driver.removeDriverConfig(name) === 0) {
        window.BsDataManager.driversMap.delete(key);
      }
    });
  }
};

export const deleteAllDrivers = () => {
  for (const [name] of window.BsDataManager.driversMap) {
    window.BsDataManager.driversMap.delete(name);
  }
};

export const setAuthorization = (authorizationTokens: AuthorizationTokens) => {
  for (const [, instance] of window.BsDataManager.driversMap) {
    instance.setAuthorization(authorizationTokens);
  }
};

export const clearTokens = () => {
  for (const [, instance] of window.BsDataManager.driversMap) {
    instance.clearTokens();
  }
};

export const hasTokens = (): boolean => {
  let value = false;
  for (const [, instance] of window.BsDataManager.driversMap) {
    if (instance.getHasTokens) {
      value = instance.getHasTokens;
    }
  }
  return value;
};

export const storedTokens = (): AuthorizationTokens => {
  let value: AuthorizationTokens = { OAUTH: '', OIDC: '' };
  for (const [, instance] of window.BsDataManager.driversMap) {
    if (instance.getStoredTokens) {
      value = instance.getStoredTokens;
    }
  }
  return value;
};

const filterDriverMap = (requestID: string): Map<string, DataManagerDriver | Proteo4Driver> => {
  return new Map(
    Array.from(window.BsDataManager.driversMap).filter(([_name, instance]) =>
      instance.getRequest(requestID, { ignoreLogs: true })
    )
  );
};

export const repeatRequest = async <T>(requestID: string): Promise<DataManagerResponse<T>> => {
  const filteredMap = filterDriverMap(requestID);
  const iterator = filteredMap.values().next();
  if (!iterator.done) {
    return iterator.value.repeatRequest(requestID);
  }
  LoggerUtils.getInstance().warn(`repeatRequest - request not found by given id: ${requestID}`, {
    remoteLogger: true,
    type: 'application'
  });

  return {
    data: { messages: repeatRequestError as DataManagerResponseError[] }
  } as DataManagerResponse<T>;
};

export const getRequest = (requestID: string): DataManagerRequestContainer | undefined => {
  const iterator = filterDriverMap(requestID).values().next();
  if (iterator.done) {
    return undefined;
  }
  return iterator.value.getRequest(requestID);
};

export const deleteRequest = (requestID: string): boolean => {
  const iterator = filterDriverMap(requestID).values().next();
  if (iterator.done) {
    return false;
  }
  return iterator.value.deleteRequest(requestID);
};

/**
 * @deprecated in favor of functions
 */
export const DataManager = {
  initInstance: initialize,
  getInstance: getDriver,
  deleteAllDrivers,
  setAuthorization,
  clearTokens
};
