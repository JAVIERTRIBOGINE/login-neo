import { beforeEach, describe, expect, it, jest, afterEach } from '@jest/globals';
import { EventManager } from '@proteo/event-bus';
import { KeepAlive } from '@proteo/keep-alive';
import type { DataManagerRequest, DataManagerResponse, DriverConfiguration } from '@proteo/types';

import type { FetchMock } from 'jest-fetch-mock';
import fetch from 'jest-fetch-mock';
const fetchMock = fetch as unknown as FetchMock;
fetchMock.enableMocks();

class MyTestObject {
  property = 'value';
}

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

const eventManagerMockPublishWithResponse: jest.MockedFunction<typeof EventManager.prototype.publishWithResponse> =
  jest.fn() as jest.MockedFunction<typeof EventManager.prototype.publishWithResponse>;
const eventManagerMockGetInstance: jest.MockedFunction<typeof EventManager.getInstance> = jest
  .fn()
  .mockImplementation(() => ({
    publishWithResponse: eventManagerMockPublishWithResponse
  })) as jest.MockedFunction<typeof EventManager.getInstance>;
EventManager.getInstance = eventManagerMockGetInstance;

describe('http-native-driver', () => {
  let HttpNativeDriver: any;
  let eventResponse: any;

  beforeEach(async () => {
    ({ HttpNativeDriver } = await import('../http-native-driver.js'));
    const testObject = new MyTestObject();
    const headers = {};
    eventResponse = {
      body: testObject,
      headers,
      status: 200,
      statusText: 'OK'
    };
    mockGetHeaders.mockReturnValue({});
    jest.spyOn(document, 'dispatchEvent');
  });

  afterEach(() => {
    jest.clearAllMocks();
    fetchMock.resetMocks();
  });

  describe('done', () => {
    it('should return response with data', async () => {
      expect.assertions(1);
      const driver = new HttpNativeDriver(config);
      const response: Response = new Response(
        JSON.stringify({
          data: 'data'
        }),
        {
          status: 200,
          statusText: 'OK'
        }
      );
      const proteoResponse: DataManagerResponse<any> = await driver.done(response);
      expect(proteoResponse).toEqual(
        expect.objectContaining({
          status: 200,
          statusText: 'OK',
          headers: expect.any(Object),
          redirected: false,
          url: '',
          data: expect.any(Buffer)
        })
      );
    });

    it('should throw error on response error', async () => {
      expect.assertions(2);
      const error = {
        alias: 'TOKEN_EXPIRED',
        message: 'The access token provided is expired, revoked, malformed, or invalid for other reasons.',
        type: 'ERROR'
      };
      const response: Response = new Response(JSON.stringify({ messages: [error] }), {
        status: 401,
        statusText: 'Unauthorized'
      });
      const driver = new HttpNativeDriver(config);
      try {
        await driver.done(response);
      } catch (error) {
        expect(document.dispatchEvent).toHaveBeenCalled();
        expect(error).toEqual(expect.objectContaining({ status: 401, statusText: 'Internal Server Error' }));
      }
    });

    it('should process nested response object', async () => {
      expect.assertions(2);
      const eventResponse = {
        response: {
          body: 'data'
        },
        headers: '',
        status: 200,
        statusText: 'OK',
        url: ''
      };

      const driver = new HttpNativeDriver(config);
      const response = await driver.done(eventResponse);

      expect(document.dispatchEvent).not.toHaveBeenCalled();
      expect(response).toEqual({
        data: 'data',
        headers: '',
        redirected: false,
        status: 200,
        statusText: 'OK',
        url: ''
      });
    });
  });

  describe('http', () => {
    beforeEach(() => {
      jest.spyOn(HttpNativeDriver.prototype, 'done').mockReturnValue('safe return');
    });

    it('should call done with response when received properly', async () => {
      expect.assertions(4);

      const driver = new HttpNativeDriver(config);
      const data = { data: 'data' };

      const request: DataManagerRequest = {
        method: 'GET',
        url: 'http://host.test/mock/test',
        data
      };

      eventManagerMockPublishWithResponse.mockImplementationOnce(async () => eventResponse as any);

      const response = await driver.http(request);

      expect(response).toBe('safe return');
      expect(eventManagerMockPublishWithResponse).toHaveBeenCalledWith(
        'HTTP',
        expect.objectContaining({
          method: 'httpRequest',
          data: expect.objectContaining({
            path: 'http://host.test/mock/test',
            method: 'GET',
            headers: expect.any(Object),
            body: JSON.stringify(data)
          })
        })
      );
      expect(HttpNativeDriver.prototype.done).toHaveBeenCalledWith(eventResponse);
      expect(document.dispatchEvent).not.toHaveBeenCalled();
    });

    it('should handle errors from EventManager', async () => {
      expect.assertions(3);
      eventManagerMockPublishWithResponse.mockRejectedValueOnce('Proteo4 Event Response Timeout');
      const driver = new HttpNativeDriver(config);
      const request: DataManagerRequest = {
        method: 'GET',
        url: 'http://host.test/mock/test',
        queryParams: {
          param: 'value'
        },
        params: {
          // eslint-disable-next-line prettier/prettier
          extraParam: 'value'
        }
      };
      try {
        await driver.http(request);
      } catch (error) {
        expect(error).toBe('Proteo4 Event Response Timeout');
        expect(HttpNativeDriver.prototype.done).not.toHaveBeenCalled();
        expect(document.dispatchEvent).toHaveBeenCalled();
      }
    });
  });
});
