import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';
import { EventManager } from '@proteo/event-bus';
import { KeepAlive } from '@proteo/keep-alive';
import { LoggerUtils } from '@proteo/logger-utils';
import type { DataManagerResponse, DriverConfiguration } from '@proteo/types';

class MyTestObject {
  public myValue = '';
}

const config: DriverConfiguration = {
  host: 'http://host.test',
  baseUrl: 'mock/test',
  name: 'test'
};

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

describe('legacy-web-driver', () => {
  let LegacyWebDriver: any;
  let driver: typeof LegacyWebDriver;
  let eventResponse: any;

  beforeEach(async () => {
    ({ LegacyWebDriver } = await import('../legacy-web-driver.js'));
    driver = new LegacyWebDriver(config);
    eventResponse = {
      headers: {},
      status: 200,
      statusText: 'OK'
    };
    eventManagerMockPublishWithResponse.mockReturnValue(eventResponse);
    LoggerUtils.prototype.info = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('http', () => {
    let doneSpy: any;

    beforeEach(() => {
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

    it('should handle EventManager timeout error', async () => {
      expect.assertions(2);
      eventManagerMockPublishWithResponse.mockRejectedValueOnce('Timeout Error');
      try {
        await driver.http({ method: 'POST', url: 'accountsPosition' });
      } catch (error) {
        expect(error).toBe('Timeout Error');
        expect(doneSpy).not.toHaveBeenCalled();
      }
    });
  });

  describe('done', () => {
    let baseBridgeResponse: any;

    beforeEach(() => {
      baseBridgeResponse = {
        status: 200,
        data: {
          myData: 'my-data'
        },
        headers: { 'content-type': 'application/json' }
      };
    });

    it('log the received response', async () => {
      expect.assertions(1);
      await driver.done(baseBridgeResponse);
      expect(LoggerUtils.prototype.info).toHaveBeenCalledWith('RESPONSE-RECEIVED', expect.anything());
    });

    it('should control NETi error responses from 200 code', async () => {
      expect.assertions(2);
      baseBridgeResponse.data.errorCode = 'mockErrorCode';
      try {
        await driver.done(baseBridgeResponse);
      } catch (error) {
        expect(error).toStrictEqual({
          data: {
            messages: [expect.objectContaining({ alias: 'mockErrorCode', type: 'ERROR' })]
          },
          status: 500,
          statusText: 'Internal Server Error',
          headers: { 'content-type': 'application/json' }
        });
        expect(LoggerUtils.prototype.info).not.toHaveBeenCalled();
      }
    });

    it('should forbid responses without headers', async () => {
      expect.assertions(2);
      baseBridgeResponse.headers = 'undefined';
      try {
        await driver.done(baseBridgeResponse);
      } catch (error) {
        expect(error).toStrictEqual(
          expect.objectContaining({
            status: 403,
            statusText: 'Forbidden'
          })
        );
        expect(LoggerUtils.prototype.info).not.toHaveBeenCalled();
      }
    });

    it('should forbid responses with html content-type', async () => {
      expect.assertions(2);
      baseBridgeResponse.headers['content-type'] = 'html';
      try {
        await driver.done(baseBridgeResponse);
      } catch (error) {
        expect(error).toStrictEqual(
          expect.objectContaining({
            status: 403,
            statusText: 'Forbidden'
          })
        );
        expect(LoggerUtils.prototype.info).not.toHaveBeenCalled();
      }
    });
  });
});
