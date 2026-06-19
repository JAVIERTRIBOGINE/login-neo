import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { HttpDriver } from '@proteo/data-manager-driver-http';
import { LegacyDriver } from '@proteo/data-manager-driver-legacy';
import { Proteo4Driver } from '@proteo/data-manager-driver-proteo4';
import { LoggerUtils } from '@proteo/logger-utils';
import type {
  AuthorizationTokens,
  DataManagerConfig,
  DataManagerExtendedRequest,
  DataManagerRequest
} from '@proteo/types';
import {
  clearTokens,
  hasTokens,
  deleteAllDrivers,
  deleteDriver,
  deleteRequest,
  getDriver,
  getRequest,
  hasDriver,
  initialize,
  repeatRequest,
  setAuthorization,
  storedTokens
} from '../data-manager.js';
import type { FetchMock } from 'jest-fetch-mock';
import fetch from 'jest-fetch-mock';
import { DataManagerDriver } from '@proteo/data-manager-driver';
import { repeatRequestError } from '@proteo/data-manager-utils';

const fetchMock = fetch as unknown as FetchMock;

fetchMock.enableMocks();

const config: DataManagerConfig = {
  DEFAULT: {
    HOST: 'https://default.mock',
    BASE_PATH: '/default',
    DRIVER: 'P4',
    INTERCEPTORS: [
      {
        CODE: 407,
        EVENT: 'EVENT_407',
        REPEAT: true
      }
    ]
  },
  TEST: {
    HOST: 'https://test.mock',
    BASE_PATH: '/test',
    DRIVER: 'P4'
  }
};

describe('data-manager', () => {
  beforeEach(() => {
    LoggerUtils.prototype.error = jest.fn() as jest.MockedFunction<typeof LoggerUtils.prototype.error>;
    LoggerUtils.prototype.warn = jest.fn() as jest.MockedFunction<typeof LoggerUtils.prototype.warn>;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    deleteAllDrivers();
  });

  describe('initInstance', () => {
    it('should log an error if config is not provided', async () => {
      expect.assertions(2);
      // @ts-expect-error - testing no arguments
      const initDataManager = () => initialize();
      const errorMessage = '[DataManager] A config is needed to initialize the Data Manager';
      expect(await initDataManager).rejects.toThrowError(errorMessage);
      expect(LoggerUtils.prototype.error).toBeCalledWith(errorMessage, { remoteLogger: true, type: 'application' });
    });

    it('should log an error if config is an empty object', async () => {
      expect.assertions(2);
      const initDataManager = () => initialize({});
      const errorMessage = '[DataManager] A config is needed to initialize the Data Manager';
      expect(await initDataManager).rejects.toThrowError(errorMessage);
      expect(LoggerUtils.prototype.error).toBeCalledWith(errorMessage, { remoteLogger: true, type: 'application' });
    });

    it('should log an error if try to get the instance without initializing it', () => {
      expect.assertions(1);
      getDriver();
      const errorMessage = '[DataManager] Data manager with name "DEFAULT" don\'t found';
      expect(LoggerUtils.prototype.error).toBeCalledWith(errorMessage, { remoteLogger: true, type: 'application' });
    });

    it('should create a DEFAULT instance if APIconfig is provided', async () => {
      expect.assertions(1);
      await initialize(config);
      const driver = getDriver();
      expect(driver).toBeTruthy();
    });

    it('should create a P4 driver if no driver specified', async () => {
      expect.assertions(1);
      await initialize(config);
      const driver = getDriver();
      expect(driver).toBeInstanceOf(Proteo4Driver);
    });

    it("should create a HTTP driver if it's specified", async () => {
      expect.assertions(1);
      const httpConfig: DataManagerConfig = {
        DEFAULT: {
          ...config.DEFAULT,
          DRIVER: 'HTTP'
        }
      };
      await initialize(httpConfig);
      const driver = getDriver();
      expect(driver).toBeInstanceOf(HttpDriver);
    });

    it("should create a Legacy driver if it's specified", async () => {
      expect.assertions(1);
      const legacyConfig: DataManagerConfig = {
        DEFAULT: {
          ...config.DEFAULT,
          DRIVER: 'LEGACY'
        }
      };
      await initialize(legacyConfig);
      const driver = getDriver();
      expect(driver).toBeInstanceOf(LegacyDriver);
    });

    it('should directly add drivers to existing map on second initialization if existing driver', async () => {
      expect.assertions(3);
      await initialize(config);
      expect(window.BsDataManager.driversMap.size).toBe(1);
      const anotherDriverConfig: DataManagerConfig = {
        ANOTHER_P4: {
          ...config.DEFAULT
        }
      };
      await initialize(anotherDriverConfig);
      expect(window.BsDataManager.driversMap.size).toBe(1);
      const driver = getDriver();
      expect((driver as any).instance._apis.size).toBe(3);
    });
  });

  describe('getInstance without DEFAULT', () => {
    it("should log an error if missing param name and DEFAULT doesn't exists", async () => {
      expect.assertions(1);
      await getDriver();
      const errorMessage = '[DataManager] Data manager with name "DEFAULT" don\'t found';
      expect(LoggerUtils.prototype.error).toBeCalledWith(errorMessage, { remoteLogger: true, type: 'application' });
    });
    it('should return the DEFAULT instance if no name is provided', async () => {
      expect.assertions(1);
      await initialize(config);
      const driver = getDriver();
      expect(driver).toBeInstanceOf(Proteo4Driver);
    });
    it('should return the instance', async () => {
      expect.assertions(1);
      await initialize(config);
      const driver = getDriver('TEST');
      expect(driver).toBeInstanceOf(Proteo4Driver);
    });
  });

  describe('getInstance with DEFAULT', () => {
    it('should return the DEFAULT instance if no name is provided', async () => {
      expect.assertions(1);
      await initialize(config);
      const driver = getDriver();
      expect(driver).toBeInstanceOf(Proteo4Driver);
    });
    it('should return the instance', async () => {
      expect.assertions(1);
      await initialize(config);
      const driver = getDriver('TEST');
      expect(driver).toBeInstanceOf(Proteo4Driver);
    });
  });

  describe('hasDriver', () => {
    it("should return false if the Driver instance doesn't exsit", () => {
      expect.assertions(1);
      expect(hasDriver('TEST')).toBe(false);
    });
    it('should return true if the Driver instance exsits', async () => {
      expect.assertions(1);
      await initialize(config);
      expect(hasDriver('TEST')).toBe(true);
    });
  });

  describe('deleteInstance', () => {
    it('should log an error if missing param name', async () => {
      expect.assertions(1);
      // @ts-expect-error testing no arguments
      deleteDriver();
      const errorMessage = '[DataManager] Missing param "name"';
      expect(LoggerUtils.prototype.error).toBeCalledWith(errorMessage, { remoteLogger: true, type: 'application' });
    });

    it('should delete the instance', async () => {
      expect.assertions(2);
      await initialize(config);
      deleteDriver('TEST');
      expect(LoggerUtils.prototype.error).not.toBeCalled();
      expect(hasDriver('TEST')).toBeFalsy();
    });

    it('should delete the driver when removing the last instance', async () => {
      expect.assertions(3);
      const httpConfig: DataManagerConfig = {
        TEST: {
          ...config.TEST,
          DRIVER: 'HTTP'
        }
      };
      await initialize(httpConfig);
      expect(window.BsDataManager.driversMap.get('HTTP')).toBeTruthy();
      deleteDriver('TEST');
      expect(LoggerUtils.prototype.error).not.toBeCalled();
      expect(window.BsDataManager.driversMap.get('HTTP')).toBeFalsy();
    });
  });

  describe('deleteAllDrivers', () => {
    it('should remove all instances', async () => {
      expect.assertions(1);
      await initialize(config);
      deleteAllDrivers();
      expect(hasDriver('P4')).toBe(false);
    });
  });

  describe('setAuthorization', () => {
    it('should call setAuthorization in all instances', async () => {
      expect.assertions(1);
      const { Proteo4Driver } = await import('@proteo/data-manager-driver-proteo4');
      jest.spyOn(Proteo4Driver.prototype, 'setAuthorization');
      await initialize(config);
      const tokens: AuthorizationTokens = { OAUTH: 'token', OIDC: 'token' };
      setAuthorization(tokens);
      expect(Proteo4Driver.prototype.setAuthorization).toBeCalledTimes(1);
    });
  });

  describe('clearTokens', () => {
    it('should call clearTokens in all instances', async () => {
      expect.assertions(1);
      const { Proteo4Driver } = await import('@proteo/data-manager-driver-proteo4');
      jest.spyOn(Proteo4Driver.prototype, 'clearTokens');
      await initialize(config);
      clearTokens();
      expect(Proteo4Driver.prototype.clearTokens).toBeCalledTimes(1);
    });
  });

  describe('hasTokens', () => {
    it('should check if any of the instances have tokens', async () => {
      expect.assertions(2);
      const { Proteo4Driver } = await import('@proteo/data-manager-driver-proteo4');
      const getHasTokensSpy = jest.spyOn(Proteo4Driver.prototype, 'getHasTokens', 'get');
      await initialize(config);
      const tokens: AuthorizationTokens = { OAUTH: 'token', OIDC: 'token' };
      setAuthorization(tokens);
      const hasAuthTokens = hasTokens();
      expect(hasAuthTokens).toBe(true);
      expect(getHasTokensSpy).toBeCalledTimes(2);
    });
  });

  describe('storedTokens', () => {
    it('should return stored tokens', async () => {
      expect.assertions(2);
      const { Proteo4Driver } = await import('@proteo/data-manager-driver-proteo4');
      const getStoredTokensSpy = jest.spyOn(Proteo4Driver.prototype, 'getStoredTokens', 'get');
      await initialize(config);
      const tokens: AuthorizationTokens = { OAUTH: 'token', OIDC: 'token' };
      setAuthorization(tokens);
      const stored = storedTokens();
      expect(stored).toStrictEqual({ OAUTH: 'token', OIDC: 'token' });
      expect(getStoredTokensSpy).toBeCalledTimes(2);
    });
  });

  describe('stored requests', () => {
    let driver: DataManagerDriver;
    const request: DataManagerExtendedRequest = {
      method: 'GET',
      url: 'http://localhost:8080/mock/test',
      headers: {},
      interceptors: [
        {
          code: 407,
          event: 'EVENT_407',
          repeat: true
        }
      ],
      driverName: 'DEFAULT'
    };
    const body407 = JSON.stringify({
      data: { field: 'data407' },
      pagination: 'pagination407'
    });
    const init407 = {
      status: 407,
      statusText: 'KO',
      headers: {
        'content-type': 'application/json'
      }
    };

    beforeEach(async () => {
      await initialize(config);
      driver = getDriver('DEFAULT') as DataManagerDriver;
    });
    afterEach(() => {
      (driver as any).instance.storedRequests.forEach((_request: DataManagerRequest, key: string) => {
        driver.deleteRequest(key);
      });
      jest.clearAllMocks();
    });

    it('should repeat stored request from P4 driver', async () => {
      expect.assertions(2);
      const response407 = new Response(body407, init407);
      jest.spyOn(Proteo4Driver.prototype, 'repeatRequest');
      try {
        await driver.done(response407, request);
        throw new Error();
      } catch (e) {
        try {
          await repeatRequest((driver as any).instance.storedRequests.keys().next().value);
          throw new Error();
        } catch (e) {
          expect(Proteo4Driver.prototype.repeatRequest).toHaveBeenCalledTimes(1);
          expect(Proteo4Driver.prototype.repeatRequest).toHaveBeenCalledWith(
            (driver as any).instance.storedRequests.keys().next().value
          );
        }
      }
    });

    it('should fail if the requested request to repeat does not exist', async () => {
      expect.assertions(1);
      const response = await repeatRequest('MY_ID');
      expect(response).toEqual({
        data: {
          messages: repeatRequestError
        }
      });
    });

    it('should retrieve stored request from P4 driver', async () => {
      expect.assertions(2);
      const response407 = new Response(body407, init407);
      const getRequestSpy = jest.spyOn(Proteo4Driver.prototype, 'getRequest');
      try {
        await driver.done(response407, request);
      } catch (e) {
        const { interceptors: _i, driverName: _d, ...requestWithoutInterceptors } = request;
        expect(getRequest((driver as any).instance.storedRequests.keys().next().value)).toStrictEqual({
          driverName: 'DEFAULT',
          request: requestWithoutInterceptors
        });
        expect(getRequestSpy).toHaveBeenCalled();
      }
    });

    it('should return undefined if requested request to get does not exist', async () => {
      expect.assertions(1);
      expect(getRequest('NOT_EXISTING_ID')).toBe(undefined);
    });

    it('should delete stored request from P4 driver', async () => {
      expect.assertions(2);
      const response407 = new Response(body407, init407);
      const deleteRequestSpy = jest.spyOn(Proteo4Driver.prototype, 'deleteRequest');
      try {
        await driver.done(response407, request);
      } catch (e) {
        expect(deleteRequest((driver as any).instance.storedRequests.keys().next().value)).toBe(true);
        expect(deleteRequestSpy).toHaveBeenCalled();
      }
    });

    it('should return false if requested request to delete does not exist', async () => {
      expect.assertions(1);
      expect(deleteRequest('NOT_EXISTING_ID')).toBe(false);
    });
  });
});
