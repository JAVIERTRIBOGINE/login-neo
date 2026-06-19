import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { LoggerUtils } from '@proteo/logger-utils';
import type { DataManagerRequest } from '@proteo/types';

const mockInstanceHttp = jest.fn();
const mockInstanceDone = jest.fn();
const mockDataManagerDriverConstructor = jest.fn();
const mockDataManagerDriverGetUrl = jest.fn();
mockDataManagerDriverConstructor.mockImplementation(() => {
  return 'mockDataManagerDriverConstructorCalled';
});
jest.unstable_mockModule('../data-manager-driver.js', () => ({
  DataManagerDriver: class {
    constructor() {
      mockDataManagerDriverConstructor();
    }
    instance = {
      http: mockInstanceHttp,
      done: mockInstanceDone
    };
    getUrl = mockDataManagerDriverGetUrl;
  }
}));

describe('generic-driver', () => {
  let GenericDriver: any;

  beforeEach(async () => {
    LoggerUtils.prototype.debug = jest.fn();
    LoggerUtils.prototype.info = jest.fn();
    LoggerUtils.prototype.warn = jest.fn();
    LoggerUtils.prototype.error = jest.fn();
    ({ GenericDriver } = await import('../generic-driver.js'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should delegate constructor to parent', () => {
      expect.assertions(2);
      const driver = new GenericDriver();
      expect(driver).toBeInstanceOf(GenericDriver);
      expect(mockDataManagerDriverConstructor).toHaveBeenCalled();
    });
  });

  describe('methods', () => {
    let driver: any;
    let baseRequest: DataManagerRequest;

    beforeEach(async () => {
      driver = new GenericDriver();
      baseRequest = {
        method: 'GET',
        url: '/mock-url'
      };
    });

    describe('basicHttpOperations', () => {
      it('should set processedUrl to url if no baseUrl is set', () => {
        expect.assertions(1);
        driver.basicHttpOperations(baseRequest, {}, 'mockDriverName');
        expect(baseRequest).toStrictEqual(expect.objectContaining({ processedUrl: '/mock-url' }));
      });

      it('should set processedUrl to getUrl from parent if baseURL is set', () => {
        expect.assertions(2);
        mockDataManagerDriverGetUrl.mockReturnValueOnce('/mock-parent-get-url');
        (driver as any).baseURL = 'mockBaseUrl';
        driver.basicHttpOperations(baseRequest, {}, 'mockDriverName');
        expect(mockDataManagerDriverGetUrl).toHaveBeenCalled();
        expect(baseRequest).toStrictEqual(expect.objectContaining({ processedUrl: '/mock-parent-get-url' }));
      });

      it('should append params to processedUrl if queryParams is set', () => {
        expect.assertions(1);
        baseRequest.queryParams = {
          mockParam1: 'mockValue1'
        };
        driver.basicHttpOperations(baseRequest, {}, 'mockDriverName');
        expect(baseRequest).toStrictEqual(expect.objectContaining({ processedUrl: '/mock-url?mockParam1=mockValue1' }));
      });

      it('should emit an info log if the processedUrl is NOT for logging', () => {
        expect.assertions(1);
        driver.basicHttpOperations(baseRequest, {}, 'mockDriverName');
        expect(LoggerUtils.prototype.info).toHaveBeenCalled();
      });

      it('should NOT emit an info log if the processedUrl is for access logging', () => {
        expect.assertions(1);
        baseRequest.url = '/mock-url/logs/access';
        driver.basicHttpOperations(baseRequest, {}, 'mockDriverName');
        expect(LoggerUtils.prototype.info).not.toHaveBeenCalled();
      });

      it('should NOT emit an info log if the processedUrl is for application logging', () => {
        expect.assertions(1);
        baseRequest.url = '/mock-url/logs/application';
        driver.basicHttpOperations(baseRequest, {}, 'mockDriverName');
        expect(LoggerUtils.prototype.info).not.toHaveBeenCalled();
      });
    });

    describe('http', () => {
      it('should delegate http call to instance class', () => {
        expect.assertions(1);
        driver.http(baseRequest);
        expect(mockInstanceHttp).toHaveBeenCalled();
      });

      it('should modify the request accordingly if redirect option is properly included', () => {
        expect.assertions(1);
        baseRequest.options = {
          redirect: 'manual'
        };
        driver.http(baseRequest);
        expect(mockInstanceHttp).toHaveBeenCalledWith(expect.objectContaining({ options: { redirect: 'manual' } }));
      });

      it('should modify the request with default case if redirect option is wrongly included', () => {
        expect.assertions(1);
        baseRequest.options = {
          redirect: 'mock' as any
        };
        driver.http(baseRequest);
        expect(mockInstanceHttp).toHaveBeenCalledWith(expect.objectContaining({ options: { redirect: 'follow' } }));
      });
    });

    describe('done', () => {
      it('should delegate done call to instance class', () => {
        expect.assertions(1);
        driver.done({});
        expect(mockInstanceDone).toHaveBeenCalled();
      });
    });

    describe('not-allowed-methods', () => {
      const genericError = {
        messages: [
          {
            alias: 'Internal Server Error',
            message: 'Internal Server Error',
            type: 'ERROR'
          }
        ]
      };
      it('should reject downloadFile method if not overriden', async () => {
        expect.assertions(2);
        try {
          await driver.downloadFile({});
        } catch (error) {
          expect(error).toStrictEqual(genericError);
          expect(LoggerUtils.prototype.error).toHaveBeenCalled();
        }
      });

      it('should reject repeatRequest method if not overriden', async () => {
        expect.assertions(2);
        try {
          await driver.repeatRequest('');
        } catch (error) {
          expect(error).toStrictEqual(genericError);
          expect(LoggerUtils.prototype.error).toHaveBeenCalled();
        }
      });

      it('should log an error for deleteRequest method if not overriden and return false', () => {
        expect.assertions(2);
        expect(driver.deleteRequest('')).toBe(false);
        expect(LoggerUtils.prototype.error).toHaveBeenCalled();
      });

      it('should log an error for getRequest method if not overriden and return undefined', () => {
        expect.assertions(2);
        expect(driver.getRequest('')).toBe(undefined);
        expect(LoggerUtils.prototype.error).toHaveBeenCalled();
      });
    });
  });
});
