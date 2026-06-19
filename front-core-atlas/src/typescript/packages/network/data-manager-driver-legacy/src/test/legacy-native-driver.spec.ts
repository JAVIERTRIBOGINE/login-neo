import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';
import { EventManager } from '@proteo/event-bus';
import { KeepAlive } from '@proteo/keep-alive';
import type { DataManagerResponse, DriverConfiguration, NativeApiResponse } from '@proteo/types';
import { LoggerUtils } from '@proteo/logger-utils';
class MyTestObject {
  property = 'value';
}

const config: DriverConfiguration = {
  host: 'http://host.test',
  baseUrl: 'mock/test',
  name: 'test'
};

const mockGetHeaders = jest.fn();
const mockGetUrl = jest.fn();
jest.unstable_mockModule('@proteo/data-manager-driver', () => ({
  GenericDriver: class {
    getHeaders = mockGetHeaders;
    getUrl = mockGetUrl;
  },
  DATA_MANAGER_ERROR: 'bsDataManagerError'
}));

const mockKeepAlive = jest.fn();
const keepAliveMockGetInstance: jest.MockedFunction<typeof KeepAlive.getInstance> = jest
  .fn()
  .mockImplementation(() => ({
    keepAlive: mockKeepAlive
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

describe('legacy-native-driver', () => {
  let LegacyNativeDriver: any;
  let testObject: any;
  let eventResponse: any;

  beforeEach(async () => {
    ({ LegacyNativeDriver } = await import('../legacy-native-driver.js'));
    testObject = new MyTestObject();
    eventResponse = {
      body: testObject,
      headers: {},
      status: 200,
      statusText: 'OK'
    };
    eventManagerMockPublishWithResponse.mockReturnValue(eventResponse);
    mockGetHeaders.mockReturnValue({});
    mockGetUrl.mockReturnValue('mockUrl');
    LoggerUtils.prototype.info = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('http', () => {
    let driver: typeof LegacyNativeDriver;
    let doneSpy: jest.MockedFunction<typeof LegacyNativeDriver.prototype.done>;

    beforeEach(() => {
      driver = new LegacyNativeDriver(config);
      doneSpy = jest.spyOn(driver, 'done');
      doneSpy.mockImplementation(() => Promise.resolve({ data: 'OK Response' } as DataManagerResponse<string>));
    });

    it('should call KeepAlive on http call', async () => {
      expect.assertions(1);
      await driver.http({ method: 'POST', url: 'accountsPosition' });
      expect(mockKeepAlive).toHaveBeenCalled();
    });

    it('should call done method with event response', async () => {
      expect.assertions(2);
      const res: DataManagerResponse<MyTestObject> = await driver.http({ method: 'POST', url: 'accountsPosition' });
      expect(doneSpy).toHaveBeenCalledWith(eventResponse);
      expect(res.data).toBe('OK Response');
    });

    it('should form url properly if baseURL is present', async () => {
      expect.assertions(1);
      (driver as any).baseURL = 'mockBaseURL';
      await driver.http({ method: 'POST', url: 'accountsPosition' });
      expect(mockGetUrl).toHaveBeenCalledTimes(1);
    });

    it('should take param url if baseURL is no set', async () => {
      expect.assertions(1);
      await driver.http({ method: 'POST', url: 'accountsPosition' });
      expect(mockGetUrl).not.toHaveBeenCalled();
    });

    it('should handle errors from EventManager', async () => {
      expect.assertions(2);
      eventManagerMockPublishWithResponse.mockRejectedValueOnce('Proteo4 Event Response Timeout');
      try {
        await driver.http({ method: 'POST', url: 'accountsPosition' });
      } catch (error) {
        expect(doneSpy).not.toHaveBeenCalled();
        expect(error).toBe('Proteo4 Event Response Timeout');
      }
    });

    it('should send json body data as string to EventManager', async () => {
      expect.assertions(1);

      const url = 'accountsPosition';
      const method = 'POST';

      // Test emitted body as string
      const data = { data: 'value' };
      const expectedData = '{"data":"value"}';
      await driver.http({ method, url, data });
      expect(eventManagerMockPublishWithResponse).toHaveBeenCalledWith('HTTP', {
        data: expect.objectContaining({
          body: expectedData,
          method,
          path: 'accountsPosition',
          headers: {},
          driverType: 'LEGACY'
        }),
        method: 'httpRequest'
      });
    });

    it('should send params into request', async () => {
      expect.assertions(1);

      const url = 'accountsPosition';
      const queryParams = { 'my-param': 'my-value' };
      const method = 'POST';

      jest.spyOn(EventManager.prototype, 'publishWithResponse') as jest.MockedFunction<
        typeof EventManager.prototype.publishWithResponse
      >;

      // Test emitted body as string
      const data = { data: 'value' };
      const expectedData = '{"data":"value"}';
      await driver.http({ method, url, data, queryParams });
      expect(eventManagerMockPublishWithResponse).toHaveBeenCalledWith('HTTP', {
        data: expect.objectContaining({ body: expectedData, method, path: url, params: queryParams }),
        method: 'httpRequest'
      });
    });
  });

  describe('done', () => {
    let driver: typeof LegacyNativeDriver;
    let baseResponse: NativeApiResponse<string>;

    beforeEach(() => {
      driver = new LegacyNativeDriver(config);
      baseResponse = {
        status: 200,
        statusText: 'OK',
        headers: {}
      };
    });

    it('should process response with response field as the preferent', async () => {
      expect.assertions(1);
      baseResponse.response = { status: 202, headers: {} };
      const response = await driver.done(baseResponse);
      expect(response).toStrictEqual(expect.objectContaining({ status: 202, statusText: 'OK', headers: {} }));
    });

    it('should process OK response', async () => {
      expect.assertions(2);
      const response = await driver.done(baseResponse);
      expect(response).toStrictEqual(expect.objectContaining({ status: 200, statusText: 'OK', headers: {} }));
      expect(LoggerUtils.prototype.info).toHaveBeenCalledWith('RESPONSE-RECEIVED', expect.anything(), {
        driver: 'legacy-web-driver'
      });
    });

    it('should process KO response without body', async () => {
      expect.assertions(1);
      baseResponse.status = 500;
      baseResponse.statusText = 'KO';
      try {
        await driver.done(baseResponse);
      } catch (error) {
        expect(error).toStrictEqual(expect.objectContaining({ status: 500, statusText: 'Internal Server Error' }));
      }
    });

    it('should process KO response with body', async () => {
      expect.assertions(1);
      baseResponse.status = 500;
      baseResponse.statusText = 'KO';
      baseResponse.body = {
        errorMessage: 'mockErrorMessage',
        errorMessageTitle: 'mockErrorMessageTitle',
        errorMessageDetail: 'mockErrorMessageDetail'
      } as any;
      try {
        await driver.done(baseResponse);
      } catch (error) {
        expect(error).toStrictEqual(
          expect.objectContaining({
            status: 500,
            statusText: 'Internal Server Error',
            data: {
              messages: [
                {
                  alias: 'mockErrorMessage',
                  message: 'mockErrorMessageDetail',
                  title: 'mockErrorMessageTitle',
                  type: 'ERROR'
                }
              ]
            }
          })
        );
      }
    });
  });
});
