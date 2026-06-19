import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { DataManagerRequest, DriverConfiguration, DataManagerResponse } from '@proteo/types';
import { KeepAlive } from '@proteo/keep-alive';

import type { FetchMock } from 'jest-fetch-mock';
import fetch from 'jest-fetch-mock';
import { LoggerUtils } from '@proteo/logger-utils';
const fetchMock = fetch as unknown as FetchMock;
fetchMock.enableMocks();

const config: DriverConfiguration = {
  host: 'http://host.test',
  baseUrl: 'mock/test',
  name: 'test'
};
const mockGetHeaders = jest.fn();
jest.unstable_mockModule('@proteo/data-manager-driver', () => ({
  GenericDriver: class {
    getHeaders = mockGetHeaders;
    basicHttpOperations = jest.fn().mockImplementation((request) => {
      (request as any).processedUrl = 'http://host.test/mock/test';
    });
  },
  DATA_MANAGER_ERROR: 'bsDataManagerError'
}));

const keepAliveMockGetInstance: jest.MockedFunction<typeof KeepAlive.getInstance> = jest
  .fn()
  .mockImplementation(() => ({
    keepAlive: jest.fn()
  })) as jest.MockedFunction<typeof KeepAlive.getInstance>;
KeepAlive.getInstance = keepAliveMockGetInstance;

describe('http-web-driver', () => {
  let HttpWebDriver: any;
  let driver: any;

  beforeEach(async () => {
    ({ HttpWebDriver } = await import('../http-web-driver.js'));
    LoggerUtils.prototype.error = jest.fn();
    LoggerUtils.prototype.debug = jest.fn();
    driver = new HttpWebDriver(config);
    jest.spyOn(document, 'dispatchEvent');
    mockGetHeaders.mockReturnValue({ 'x-request-id': 'mockedUUID' });
  });

  afterEach(() => {
    jest.clearAllMocks();
    fetchMock.resetMocks();
  });

  describe('done', () => {
    let baseResponse: Response;
    let errorResponse: Response;

    beforeEach(async () => {
      baseResponse = new Response(
        JSON.stringify({
          data: 'data'
        }),
        {
          status: 200,
          statusText: 'OK',
          headers: {
            'content-type': 'application/json'
          }
        }
      );
      errorResponse = new Response(
        JSON.stringify({
          messages: 'data'
        }),
        {
          status: 500,
          statusText: 'KO',
          headers: {
            'content-type': 'application/json'
          }
        }
      );
    });
    it('should return response when OK response', async () => {
      expect.assertions(1);
      const proteoResponse: DataManagerResponse<any> = await driver.done(baseResponse);
      expect(proteoResponse).toEqual(
        expect.objectContaining({
          status: 200,
          statusText: 'OK',
          headers: expect.objectContaining({
            'content-type': 'application/json'
          }),
          redirected: false,
          url: '',
          data: {
            data: 'data'
          }
        })
      );
    });

    it('should process properly OK response wrongly formatted', async () => {
      expect.assertions(2);
      baseResponse.json = undefined as any;

      const proteoResponse: DataManagerResponse<any> = await driver.done(baseResponse);

      expect(Object.keys(proteoResponse)).not.toContain('data');
      expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith(
        'Data Manager Correct request without body: ',
        expect.anything(),
        {
          remoteLogger: true,
          type: 'application'
        }
      );
    });

    it('should throw error when KO response', async () => {
      expect.assertions(1);
      try {
        await driver.done(errorResponse);
      } catch (error) {
        expect(error).toEqual(
          expect.objectContaining({
            status: 500,
            statusText: 'KO',
            headers: expect.objectContaining({
              'content-type': 'application/json'
            }),
            redirected: false,
            url: '',
            data: {
              messages: 'data'
            }
          })
        );
      }
    });

    it('should process properly KO response wrongly formatted', async () => {
      expect.assertions(2);
      errorResponse.json = undefined as any;
      try {
        await driver.done(errorResponse);
      } catch (error: any) {
        expect(Object.keys(error)).not.toContain('data');
        expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith(
          'Data Manager Middleware error without body: ',
          expect.anything(),
          {
            remoteLogger: true,
            type: 'application'
          }
        );
      }
    });
  });

  describe('http', () => {
    let doneSpy: jest.MockedFunction<typeof HttpWebDriver.prototype.done>;
    let baseRequest: DataManagerRequest;

    beforeEach(() => {
      doneSpy = jest.spyOn(HttpWebDriver.prototype, 'done') as jest.MockedFunction<typeof HttpWebDriver.prototype.done>;
      doneSpy.mockReturnValue('OK Response');
      fetchMock.mockResponse(JSON.stringify({ data: 'mockData' }), { status: 200 });
      baseRequest = {
        method: 'GET',
        url: ''
      };
    });

    it('should call done with fetch response', async () => {
      expect.assertions(4);
      const response = await driver.http(baseRequest);
      expect(fetchMock).toBeCalledWith(
        'http://host.test/mock/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Object),
          body: undefined,
          credentials: 'include'
        }) as RequestInit
      );
      expect(doneSpy).toBeCalledWith(expect.any(Response));
      expect(response).toBe('OK Response');
      expect(document.dispatchEvent).not.toHaveBeenCalled();
    });

    it('should properly handle url form encoded fetch', async () => {
      expect.assertions(3);
      mockGetHeaders.mockReturnValueOnce({ 'content-type': 'x-www-form-urlencoded' });
      baseRequest.data = { param1: 'mockValue1' };
      baseRequest.method = 'POST';

      const response = await driver.http(baseRequest);

      expect(doneSpy).toBeCalledWith(expect.any(Response));
      expect(response).toBe('OK Response');
      expect(document.dispatchEvent).not.toHaveBeenCalled();
    });

    it('should handle fetch error', async () => {
      expect.assertions(5);
      fetchMock.mockRejectOnce(new Error('mockError'));
      try {
        await driver.http(baseRequest);
      } catch (error: any) {
        expect(fetchMock).toHaveBeenCalled();
        expect(doneSpy).not.toHaveBeenCalled();
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('mockError');
        expect(document.dispatchEvent).toHaveBeenCalled();
      }
    });
  });
});
