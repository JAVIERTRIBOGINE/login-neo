import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { LoggerUtils } from '@proteo/logger-utils';
import type {
  AuthorizationTokens,
  DataManagerRequest,
  DataManagerRequestContainer,
  DataManagerResponse
} from '@proteo/types';
import { DataManagerDriver } from '../data-manager-driver.js';
import { EventManager } from '@proteo/event-bus';
import type { MockInstance } from 'jest-mock';

class TestDriver extends DataManagerDriver {
  http<T>(_request: DataManagerRequest): Promise<DataManagerResponse<T>> {
    return Promise.resolve({ data: 'data' } as DataManagerResponse<T>);
  }
  done<T>(_response: Response): Promise<DataManagerResponse<T>> {
    throw new Error('Method not implemented.');
  }

  downloadFile<T>(_request: DataManagerRequest): Promise<DataManagerResponse<T>> {
    throw new Error('Method not implemented.');
  }

  repeatRequest<T>(_requestID: string): Promise<DataManagerResponse<T>> {
    throw new Error('Method not implemented.');
  }

  deleteRequest(_requestID: string): boolean {
    return false;
  }

  getRequest(_requestID: string): DataManagerRequestContainer | undefined {
    return undefined;
  }

  getUrlTest(url: string): string {
    return this.getUrl(url);
  }
}

describe('data-manager-driver', () => {
  beforeEach(() => {
    LoggerUtils.prototype.debug = jest.fn();
    LoggerUtils.prototype.error = jest.fn();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should print a debug message for invalid configuration', async () => {
      expect.assertions(2);

      expect(new TestDriver({ host: 'invalid-host', baseUrl: '', name: 'test' })).toBeInstanceOf(TestDriver);
      expect(LoggerUtils.prototype.debug).toHaveBeenCalledTimes(1);
    });

    it('should print a debug message for empty configuration', async () => {
      expect.assertions(2);

      expect(new TestDriver({ host: '', baseUrl: '', name: 'test' })).toBeInstanceOf(TestDriver);
      expect(LoggerUtils.prototype.debug).toHaveBeenCalledTimes(1);
    });
  });

  describe('addAPI', () => {
    let addAPISpy: MockInstance<typeof TestDriver.prototype.addAPI>;
    let apisHaveSameUrlSpy: MockInstance<any>;
    let mergeInterceptorsIntoFirstSpy: MockInstance<any>;
    const testConfig = { host: 'http://my-host', baseUrl: '/my-base-url', name: 'TEST' };

    beforeEach(() => {
      addAPISpy = jest.spyOn(TestDriver.prototype, 'addAPI');
      apisHaveSameUrlSpy = jest.spyOn(TestDriver.prototype as any, 'apisHaveSameUrl');
      mergeInterceptorsIntoFirstSpy = jest.spyOn(TestDriver.prototype as any, 'mergeInterceptorsIntoFirst');
    });

    it('should add the first API set', async () => {
      expect.assertions(3);
      expect(new TestDriver(testConfig)).toBeInstanceOf(TestDriver);
      expect(addAPISpy).toHaveBeenCalledTimes(1);
      expect(addAPISpy).toHaveBeenCalledWith(testConfig);
    });

    it('should add a second different API with no issue', async () => {
      expect.assertions(3);
      const testDriver = new TestDriver(testConfig);
      testDriver.addAPI({ host: 'http://my-host', baseUrl: '/my-base-url', name: 'TEST2' });
      expect(addAPISpy).toHaveBeenCalledTimes(2);
      expect(apisHaveSameUrlSpy).not.toHaveBeenCalled();
      expect((testDriver as any).instance._apis.size).toBe(2);
    });

    it('should log an error if the same API is added with different urls', async () => {
      expect.assertions(3);
      const testDriver = new TestDriver(testConfig);
      testDriver.addAPI({ host: 'http://my-host', baseUrl: '/my-base-url2', name: 'TEST' });
      expect(addAPISpy).toHaveBeenCalledTimes(2);
      expect(apisHaveSameUrlSpy).toHaveBeenCalled();
      expect(LoggerUtils.prototype.error).toHaveBeenCalled();
    });

    it('should merge interceptors if the same API is added with same urls', async () => {
      expect.assertions(4);
      const testDriver = new TestDriver(testConfig);
      testDriver.addAPI({
        host: 'http://my-host',
        baseUrl: '/my-base-url',
        name: 'TEST',
        interceptors: [
          {
            code: 400,
            event: 'I1'
          }
        ]
      });
      testDriver.addAPI({
        host: 'http://my-host',
        baseUrl: '/my-base-url',
        name: 'TEST',
        interceptors: [
          {
            code: 401,
            event: 'I2'
          }
        ]
      });
      testDriver.addAPI({ host: 'http://my-host', baseUrl: '/my-base-url', name: 'TEST' });
      expect(addAPISpy).toHaveBeenCalledTimes(4);
      expect(apisHaveSameUrlSpy).toHaveBeenCalled();
      expect(mergeInterceptorsIntoFirstSpy).toHaveBeenCalled();
      expect(LoggerUtils.prototype.error).not.toHaveBeenCalled();
    });
  });

  describe('setAuthorization', () => {
    it('should setup tokens on set authorization', async () => {
      expect.assertions(1);

      const tokens: AuthorizationTokens = { OAUTH: '', OIDC: '' };
      const driver: TestDriver = new TestDriver();
      driver.setAuthorization(tokens);
      expect((driver as any).authorizationTokens).toStrictEqual(tokens);
    });
  });

  describe('getHeaders', () => {
    it('should set x-request-id header', () => {
      expect.assertions(1);

      const driver: TestDriver = new TestDriver();
      driver.setup({ host: '', baseUrl: '', name: 'test' });
      const headers = driver.getHeaders({}, 'GET');
      expect(headers['x-request-id']).toBeDefined();
    });
  });

  describe('getHasTokens', () => {
    let driver: TestDriver;

    beforeEach(() => {
      driver = new TestDriver();
    });

    it('should return false if no token is present', () => {
      expect.assertions(1);
      const tokens: AuthorizationTokens = { OAUTH: '', OIDC: '' };
      driver.setAuthorization(tokens);
      expect(driver.getHasTokens).toBeFalsy();
    });

    it('should return true if OAUTH token is present', () => {
      expect.assertions(1);
      const tokens: AuthorizationTokens = { OAUTH: 'OAUTH', OIDC: '' };
      driver.setAuthorization(tokens);
      expect(driver.getHasTokens).toBeTruthy();
    });

    it('should return true if OIDC token is present', () => {
      expect.assertions(1);
      const tokens: AuthorizationTokens = { OAUTH: '', OIDC: 'OIDC' };
      driver.setAuthorization(tokens);
      expect(driver.getHasTokens).toBeTruthy();
    });

    it('should return true if both tokens are present', () => {
      expect.assertions(1);
      const tokens: AuthorizationTokens = { OAUTH: 'OAUTH', OIDC: 'OIDC' };
      driver.setAuthorization(tokens);
      expect(driver.getHasTokens).toBeTruthy();
    });
  });

  describe('hasNativeTokens', () => {
    let driver: TestDriver;
    let mockEventManagerGetInstance: jest.MockedFunction<typeof EventManager.getInstance>;
    let mockPublishWithResponse: jest.MockedFunction<typeof EventManager.prototype.publishWithResponse>;

    beforeEach(() => {
      mockPublishWithResponse = jest
        .fn()
        .mockImplementation(() => Promise.resolve({ status: true })) as jest.MockedFunction<
        typeof EventManager.prototype.publishWithResponse
      >;
      mockEventManagerGetInstance = jest.fn().mockImplementation(() => ({
        publishWithResponse: mockPublishWithResponse
      })) as jest.MockedFunction<typeof EventManager.getInstance>;
      EventManager.getInstance = mockEventManagerGetInstance;

      LoggerUtils.prototype.error = jest.fn();

      driver = new TestDriver();
    });

    it('should request if native tokens are present via Event Manager', async () => {
      expect.assertions(3);
      const response = await driver.hasNativeTokens();
      expect(response).toBeTruthy();
      expect(mockEventManagerGetInstance).toHaveBeenCalled();
      expect(mockPublishWithResponse).toHaveBeenCalled();
    });

    it('should also return false through Event Manager if answered that way', async () => {
      expect.assertions(3);
      mockPublishWithResponse.mockImplementationOnce(() => Promise.resolve({ status: false } as any));
      const response = await driver.hasNativeTokens();
      expect(response).toBeFalsy();
      expect(mockEventManagerGetInstance).toHaveBeenCalled();
      expect(mockPublishWithResponse).toHaveBeenCalled();
    });

    it('should handle Event Manager exception', async () => {
      expect.assertions(4);
      mockPublishWithResponse.mockImplementationOnce(() => Promise.reject(false));
      const response = await driver.hasNativeTokens();
      expect(response).toBeFalsy();
      expect(mockEventManagerGetInstance).toHaveBeenCalled();
      expect(mockPublishWithResponse).toHaveBeenCalled();
      expect(LoggerUtils.prototype.error).toHaveBeenCalled();
    });
  });

  describe('clearTokens', () => {
    it('should clear tokens', async () => {
      expect.assertions(1);

      const defaultTokens: AuthorizationTokens = { OAUTH: '', OIDC: '' };
      const tokens: AuthorizationTokens = { OAUTH: 'asdasda', OIDC: 'asdfasda' };
      const driver: TestDriver = new TestDriver();
      driver['authorizationTokens'] = tokens;
      driver.clearTokens();
      expect(driver['authorizationTokens']).toStrictEqual(defaultTokens);
    });
  });

  describe('getStoredTokens', () => {
    it('should return stored tokens', () => {
      expect.assertions(1);
      const tokens: AuthorizationTokens = { OAUTH: 'OAUTH', OIDC: 'OIDC' };
      const driver: TestDriver = new TestDriver();
      driver.setAuthorization(tokens);
      expect(driver.getStoredTokens).toStrictEqual({ OAUTH: 'OAUTH', OIDC: 'OIDC' });
    });
  });

  describe('setupByName', () => {
    let driver: TestDriver;
    let setupSpy: MockInstance<any>;

    beforeEach(() => {
      driver = new TestDriver({ host: 'http://sample-host', baseUrl: '/', name: 'driver1' });
      setupSpy = jest.spyOn(driver, 'setup');
    });

    it('should run setup for a given api name', () => {
      expect.assertions(2);
      driver.setupByName('driver1');
      expect(LoggerUtils.prototype.debug).not.toHaveBeenCalled();
      expect(setupSpy).toHaveBeenCalled();
    });

    it('should log in debug if given api name is not present', () => {
      expect.assertions(2);
      driver.setupByName('driver2');
      expect(setupSpy).not.toHaveBeenCalled();
      expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith(
        "Data Manager driver could not load given config: 'driver2'",
        {
          remoteLogger: true,
          type: 'application'
        }
      );
    });
  });

  describe('hasDriverConfig', () => {
    let driver: TestDriver;

    beforeEach(() => {
      driver = new TestDriver({ host: 'http://sample-host', baseUrl: '/', name: 'driver1' });
    });

    it('should return true if driver config exist', () => {
      expect.assertions(1);
      expect(driver.hasDriverConfig('driver1')).toBeTruthy();
    });

    it('should return false if driver config does not exist', () => {
      expect.assertions(1);
      expect(driver.hasDriverConfig('driver2')).toBeFalsy();
    });
  });

  describe('removeDriverConfig', () => {
    let driver: TestDriver;

    beforeEach(() => {
      driver = new TestDriver({ host: 'http://sample-host', baseUrl: '/', name: 'driver1' });
    });

    it('should properly remove driver config', () => {
      expect.assertions(3);
      expect(driver.hasDriverConfig('driver1')).toBeTruthy();
      expect(driver.removeDriverConfig('driver1')).toBe(0);
      expect(driver.hasDriverConfig('driver1')).toBeFalsy();
    });

    it('should log an error if trying to remove a not existing driver config', () => {
      expect.assertions(2);
      expect(driver.removeDriverConfig('driver2')).toBe(1);
      expect(LoggerUtils.prototype.error).toHaveBeenCalledWith("Data Manager driver could not be found: 'driver2'", {
        remoteLogger: true,
        type: 'application'
      });
    });
  });

  describe('getUrl', () => {
    let driver: TestDriver;
    let getUrlSpy: MockInstance<any>;

    beforeEach(() => {
      driver = new TestDriver({ host: 'http://sample-host', baseUrl: '/', name: 'driver1' });
      getUrlSpy = jest.spyOn(driver as any, 'getUrl');
    });

    it('should return url if it is a proper url', () => {
      expect.assertions(2);
      expect(driver.getUrlTest('http://other-host/new-url')).toBe('http://other-host/new-url');
      expect(getUrlSpy).toHaveBeenCalled();
    });

    it('should return combined url if not proper url', () => {
      expect.assertions(2);
      expect(driver.getUrlTest('/new-url')).toBe('http://sample-host/new-url');
      expect(getUrlSpy).toHaveBeenCalled();
    });
  });

  describe('httpMethods', () => {
    let driver: TestDriver;
    let httpSpy: MockInstance<any>;
    let url: string;
    let data: string;

    beforeEach(() => {
      driver = new TestDriver({ host: 'http://sample-host', baseUrl: '/', name: 'driver1' });
      httpSpy = jest.spyOn(driver, 'http');
      url = '/mock-url';
      data = 'mock-data';
    });

    it('should call instance http with GET method', async () => {
      expect.assertions(1);
      await driver.get(url);
      expect(httpSpy).toHaveBeenCalledWith({ url, method: 'GET' });
    });

    it('should call instance http with POST method', async () => {
      expect.assertions(1);
      await driver.post(url, data);
      expect(httpSpy).toHaveBeenCalledWith({ url, method: 'POST', data });
    });

    it('should call instance http with PUT method', async () => {
      expect.assertions(1);
      await driver.put(url, data);
      expect(httpSpy).toHaveBeenCalledWith({ url, method: 'PUT', data });
    });

    it('should call instance http with PATCH method', async () => {
      expect.assertions(1);
      await driver.patch(url, data);
      expect(httpSpy).toHaveBeenCalledWith({ url, method: 'PATCH', data });
    });

    it('should call instance http with DELETE method', async () => {
      expect.assertions(1);
      await driver.delete(url);
      expect(httpSpy).toHaveBeenCalledWith({ url, method: 'DELETE' });
    });

    it('should call instance http with OPTIONS method', async () => {
      expect.assertions(1);
      await driver.options(url);
      expect(httpSpy).toHaveBeenCalledWith({ url, method: 'OPTIONS' });
    });

    it('should call instance http with HEAD method', async () => {
      expect.assertions(1);
      await driver.head(url);
      expect(httpSpy).toHaveBeenCalledWith({ url, method: 'HEAD' });
    });
  });
});
