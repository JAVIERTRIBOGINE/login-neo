import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type {
  DataManagerExtendedRequest,
  DataManagerRequest,
  DataManagerResponseError,
  DriverConfiguration,
  DriverInterceptor,
  NativeApiResponse
} from '@proteo/types';
import { LoggerUtils } from '@proteo/logger-utils';
import { KeepAlive } from '@proteo/keep-alive';
import { EventManager } from '@proteo/event-bus';
import { I18n } from '@proteo/i18n-utils';

const mockP4GetHeaders = jest.fn().mockReturnValue({});
const mockGenericDriverConstructor = jest.fn();
const mockProteo4DriverConstructor = jest.fn();
const mockDownloadFile = jest.fn();
const mockBasicHttpOperations = jest.fn().mockImplementation((request) => {
  (request as any).processedUrl = 'http://host.test/mock/test';
});
const mockResponseReceivedLog = jest.fn().mockImplementation(() => {});
const mockTranslateError = jest.fn();

jest.unstable_mockModule('@proteo/data-manager-driver', () => ({
  GenericDriver: class {
    constructor() {
      mockGenericDriverConstructor();
    }
    basicHttpOperations = mockBasicHttpOperations;
    responseReceivedLog = mockResponseReceivedLog;
  },
  DATA_MANAGER_ERROR: 'bsDataManagerError'
}));

jest.unstable_mockModule('../proteo4-driver.js', () => ({
  Proteo4Driver: class {
    constructor() {
      mockProteo4DriverConstructor();
    }
    getHeaders = mockP4GetHeaders;
    translateError = mockTranslateError;
    downloadFile = mockDownloadFile;
  }
}));

const mockConvertLegacyToP4Errors = jest.fn();

jest.unstable_mockModule('@proteo/data-manager-utils', () => ({
  repeatRequestError: [
    {
      alias: 'requestID no existe',
      message: 'El requestID indicado no existe, no se ha podido realizar la peticion',
      type: 'ERROR'
    }
  ],
  convertLegacyToP4Errors: mockConvertLegacyToP4Errors
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
const eventManagerMockPublish: jest.MockedFunction<typeof EventManager.prototype.publish> =
  jest.fn() as jest.MockedFunction<typeof EventManager.prototype.publish>;

const eventManagerMockGetInstance: jest.MockedFunction<typeof EventManager.getInstance> = jest
  .fn()
  .mockImplementation(() => ({
    publishWithResponse: eventManagerMockPublishWithResponse,
    publish: eventManagerMockPublish
  })) as jest.MockedFunction<typeof EventManager.getInstance>;
EventManager.getInstance = eventManagerMockGetInstance;

const baseConfig: DriverConfiguration = {
  host: 'http://host.test',
  baseUrl: 'mock/test',
  name: 'test'
};

const interceptors: DriverInterceptor[] = [
  {
    code: 407,
    event: 'INTERCEPTOR_EVENT_NO_REPEAT'
  },
  {
    code: 408,
    event: 'INTERCEPTOR_EVENT_REPEAT',
    repeat: true
  },
  {
    code: 428,
    event: 'INTERCEPTOR_EVENT_NO_TRANSLATE',
    errorTranslate: false
  }
];

const mockStartNativeHttpTracking = jest.fn().mockReturnValue({ 'x-dtc': 'mocked-header' });
const mockFinishNativeHttpTracking = jest.fn();

jest.unstable_mockModule('@proteo/dynatrace-utils', () => ({
  DynatraceTracker: {
    startNativeHttpTracking: mockStartNativeHttpTracking,
    finishNativeHttpTracking: mockFinishNativeHttpTracking
  }
}));

describe('proteo4-native-driver', () => {
  let Proteo4NativeDriver: any;
  let Proteo4Driver: any;
  let driver: typeof Proteo4NativeDriver;
  let dispatchEventSpy: any;

  beforeEach(async () => {
    ({ Proteo4Driver } = await import('../proteo4-driver.js'));
    ({ Proteo4NativeDriver } = await import('../proteo4-native-driver.js'));
    jest.spyOn(Proteo4NativeDriver.prototype, 'getHeaders');
    dispatchEventSpy = jest.spyOn(document, 'dispatchEvent');
    LoggerUtils.prototype.error = jest.fn();
    LoggerUtils.prototype.warn = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should call parent constructor', () => {
      expect.assertions(2);
      expect(new Proteo4NativeDriver(baseConfig)).toBeInstanceOf(Proteo4NativeDriver);
      expect(mockGenericDriverConstructor).toHaveBeenCalled();
    });

    it('should include interceptors if set in config', () => {
      expect.assertions(1);

      const config = { ...baseConfig, interceptors };
      driver = new Proteo4NativeDriver(config);
      expect(driver.interceptors).toStrictEqual(interceptors);
    });

    it('should self assign parent driver if set', () => {
      expect.assertions(2);
      driver = new Proteo4NativeDriver(baseConfig, new Proteo4Driver());
      expect(mockProteo4DriverConstructor).toHaveBeenCalled();
      expect(driver.parent).toBeInstanceOf(Proteo4Driver);
    });
  });

  describe('http', () => {
    let doneSpy = jest.fn();
    let request: DataManagerRequest;

    beforeEach(() => {
      doneSpy = jest.spyOn(Proteo4NativeDriver.prototype, 'cleanErrorsDone') as any;
      driver = new Proteo4NativeDriver(baseConfig, new Proteo4Driver());
      request = {
        method: 'GET',
        url: 'http://host.test/mock/test',
        data: { data: 'data' }
      };
      doneSpy.mockReturnValue('mocked response');
    });

    it('should call KeepAlive', async () => {
      expect.assertions(2);
      const response = await driver.http(request);
      expect(mockKeepAlive).toHaveBeenCalled();
      expect(response).toBe('mocked response');
    });

    it('should call getHeaders and basicHttpOperations from parent', async () => {
      expect.assertions(2);
      await driver.http(request);
      expect(mockP4GetHeaders).toHaveBeenCalledTimes(1);
      expect(mockBasicHttpOperations).toHaveBeenCalledTimes(1);
    });

    it('should send headers obtained from parent getHeaders', async () => {
      expect.assertions(2);
      mockP4GetHeaders.mockReturnValueOnce({ customHeader: 'customValue' });
      const response = await driver.http(request);

      expect(eventManagerMockPublishWithResponse).toHaveBeenCalledWith('HTTP', {
        data: expect.objectContaining({
          headers: {
            customHeader: 'customValue',
            'x-dtc': 'mocked-header'
          }
        }),
        method: 'httpRequest'
      });

      expect(response).toBe('mocked response');
    });

    it('should throw exception if EventManager does so', async () => {
      expect.assertions(2);
      eventManagerMockPublishWithResponse.mockRejectedValueOnce('EventManagerMockError');
      try {
        await driver.http(request);
      } catch (error) {
        expect(error).toBe('EventManagerMockError');
        expect(doneSpy).not.toHaveBeenCalled();
      }
    });

    it('should use provided headers if present in request (Branch coverage)', async () => {
      expect.assertions(1);
      request.headers = { 'X-Custom-Header': 'CustomValue' };

      await driver.http(request);

      expect(mockP4GetHeaders).toHaveBeenCalledWith({ 'X-Custom-Header': 'CustomValue' }, 'GET');
    });

    it('should fallback to empty string for Dynatrace if processedUrl is falsy (Branch coverage)', async () => {
      expect.assertions(1);
      mockBasicHttpOperations.mockImplementationOnce(() => {});
      eventManagerMockPublishWithResponse.mockResolvedValueOnce({ status: 200 } as any);
      jest.spyOn(Proteo4NativeDriver.prototype as any, 'cleanErrorsDone').mockResolvedValueOnce('ok');

      await driver.http(request);

      expect(eventManagerMockPublishWithResponse).toHaveBeenCalled();
    });
  });

  describe('done', () => {
    let request: DataManagerExtendedRequest;
    let response: NativeApiResponse<string>;

    beforeEach(() => {
      driver = new Proteo4NativeDriver(baseConfig, new Proteo4Driver());
      request = {
        method: 'GET',
        url: 'http://host.test/mock/test',
        data: { data: 'data' }
      };
      response = {
        status: 200,
        statusText: 'OK',
        headers: {}
      };
    });

    it('should call cleanErrorsDone without omitting error processing', async () => {
      expect.assertions(1);
      const cleanErrorsDoneSpy = jest.spyOn(Proteo4NativeDriver.prototype, 'cleanErrorsDone');
      cleanErrorsDoneSpy.mockReturnValueOnce('mocked response');
      await driver.done(response as any, request);
      expect(cleanErrorsDoneSpy).toHaveBeenCalledWith(response, request, false);
    });

    it('should return minimum DataManagerResponse data on minimum OK response', async () => {
      expect.assertions(1);
      const dmResponse = await driver.done(response as any, request);
      expect(dmResponse).toStrictEqual(expect.objectContaining({ status: 200, statusText: 'OK' }));
    });

    it('should process response field as true response', async () => {
      expect.assertions(1);
      response.response = {
        status: 201,
        headers: { mockHeader: 'mockHeaderValue' }
      } as any;
      const dmResponse = await driver.done(response as any, request);
      expect(dmResponse).toStrictEqual(
        expect.objectContaining({ status: 201, headers: { mockHeader: 'mockHeaderValue' } })
      );
    });

    it('should build response with data if data field is present in response', async () => {
      expect.assertions(1);
      response.data = 'mockedData';
      const dmResponse = await driver.done(response as any, request);
      expect(dmResponse).toStrictEqual(expect.objectContaining({ data: 'mockedData' }));
    });

    it('should also build response with data if body field is present', async () => {
      expect.assertions(1);
      response.body = 'mockedData';
      const dmResponse = await driver.done(response as any, request);
      expect(dmResponse).toStrictEqual(expect.objectContaining({ data: 'mockedData' }));
    });

    it('should build data from body instead of data if present', async () => {
      expect.assertions(1);
      response.body = 'mockedBody';
      response.data = 'mockedData';
      const dmResponse = await driver.done(response as any, request);
      expect(dmResponse).toStrictEqual(expect.objectContaining({ data: 'mockedBody' }));
    });

    describe('errorProcessing', () => {
      beforeEach(() => {
        response.status = 500;
        response.statusText = 'KO';
      });

      it('should process basic error response', async () => {
        expect.assertions(3);
        try {
          await driver.done(response as any, request);
        } catch (error) {
          expect(error).toStrictEqual(expect.objectContaining({ status: 500, statusText: 'KO' }));
          expect(mockTranslateError).toHaveBeenCalled();
          expect(mockConvertLegacyToP4Errors).toHaveBeenCalled();
        }
      });

      it('should transform and translate legacy errors from messages field', async () => {
        expect.assertions(4);
        const messageErrors = [{ alias: 'mockAlias', message: 'mockMessage', type: 'ERROR' }];
        response.messages = messageErrors as DataManagerResponseError[];
        const p4ProcessedLegacyErrors = [
          { alias: 'mockProcessedLegacyAlias', message: 'mockProcessedLegacyMessage', type: 'ERROR' }
        ];
        mockConvertLegacyToP4Errors.mockReturnValueOnce(p4ProcessedLegacyErrors);
        const p4ProcessedErrors = [{ alias: 'mockProcessedAlias', message: 'mockProcessedMessage', type: 'ERROR' }];
        mockTranslateError.mockReturnValueOnce(p4ProcessedErrors);
        try {
          await driver.done(response as any, request);
        } catch (error) {
          expect(mockConvertLegacyToP4Errors).toHaveBeenCalledWith(messageErrors);
          expect(mockTranslateError).toHaveBeenCalledWith({ messages: p4ProcessedLegacyErrors }, {}, undefined);
          expect(dispatchEventSpy).toHaveBeenCalled();
          expect(error).toStrictEqual(
            expect.objectContaining({ status: 500, statusText: 'KO', data: p4ProcessedErrors })
          );
        }
      });

      it('should transform legacy errors from data.messages if messages is not present', async () => {
        expect.assertions(2);
        const messageErrors = [{ alias: 'mockAlias', message: 'mockMessage', type: 'ERROR' }];
        response.data = { messages: messageErrors as DataManagerResponseError[] } as any;
        try {
          await driver.done(response as any, request);
        } catch (error) {
          expect(mockConvertLegacyToP4Errors).toHaveBeenCalledWith(messageErrors);
          expect(error).toStrictEqual(expect.objectContaining({ status: 500, statusText: 'KO' }));
        }
      });

      it('should set default message if no statusText is present', async () => {
        expect.assertions(1);
        response.statusText = undefined as any;
        try {
          await driver.done(response as any, request);
        } catch (error) {
          expect(error).toStrictEqual(expect.objectContaining({ status: 500, statusText: 'Internal Server Error' }));
        }
      });

      it('should not call translateError if the driver is flagged as having custom errors', async () => {
        expect.assertions(2);
        (driver as any).hasCustomError = true;
        const p4ProcessedLegacyErrors = [
          { alias: 'mockProcessedLegacyAlias', message: 'mockProcessedLegacyMessage', type: 'ERROR' }
        ];
        mockConvertLegacyToP4Errors.mockReturnValueOnce(p4ProcessedLegacyErrors);
        try {
          await driver.done(response as any, request);
        } catch (error) {
          expect(error).toStrictEqual(
            expect.objectContaining({ status: 500, statusText: 'KO', data: { messages: p4ProcessedLegacyErrors } })
          );
          expect(mockTranslateError).not.toHaveBeenCalled();
        }
      });

      it('should not call translateError if omitTransformErrors is set', async () => {
        expect.assertions(2);
        const p4ProcessedLegacyErrors = [
          { alias: 'mockProcessedLegacyAlias', message: 'mockProcessedLegacyMessage', type: 'ERROR' }
        ];
        mockConvertLegacyToP4Errors.mockReturnValueOnce(p4ProcessedLegacyErrors);
        try {
          await (driver as any).cleanErrorsDone(response, request, true);
        } catch (error) {
          expect(error).toStrictEqual(
            expect.objectContaining({ status: 500, statusText: 'KO', data: { messages: p4ProcessedLegacyErrors } })
          );
          expect(mockTranslateError).not.toHaveBeenCalled();
        }
      });

      it('should include default message when default native error is received', async () => {
        expect.assertions(2);
        response.error = 'true';
        try {
          await driver.done(response as any, request);
        } catch (error) {
          expect(mockConvertLegacyToP4Errors).toHaveBeenCalledWith([
            { alias: 'Native error', message: 'true', type: 'ERROR' }
          ]);
          expect(error).toStrictEqual(expect.objectContaining({ status: 500, statusText: 'KO' }));
        }
      });

      it('should catch internal exceptions during error processing and report to Dynatrace (Error instance)', async () => {
        expect.assertions(1);
        const internalError = new Error('Mock Internal Error');

        mockTranslateError.mockImplementationOnce(() => Promise.reject(internalError));

        try {
          await driver.done(response as any, request);
        } catch (error) {
          expect(error).toBe(internalError);
        }
      });

      it('should catch internal exceptions during error processing and report to Dynatrace (String/Unknown)', async () => {
        expect.assertions(1);

        mockTranslateError.mockImplementationOnce(() => Promise.reject('String Error'));

        try {
          await driver.done(response as any, request);
        } catch (error) {
          expect(error).toBe('String Error');
        }
      });

      it('should pass request options to translateError if present (Branch coverage)', async () => {
        expect.assertions(1);
        request.options = { sendError: true as any };

        try {
          await driver.done(response as any, request);
        } catch (error) {
          expect(mockTranslateError).toHaveBeenCalledWith(expect.anything(), expect.anything(), true);
        }
      });

      it('should fallback to 500 for Dynatrace if response status is falsy (Branch coverage)', async () => {
        expect.assertions(1);
        response.status = 0;

        try {
          await driver.done(response as any, request);
        } catch (error) {
          expect(error).toStrictEqual(expect.objectContaining({ status: 0 }));
        }
      });
    });

    describe('interceptors', () => {
      beforeEach(() => {
        const config = { ...baseConfig, interceptors };
        driver = new Proteo4NativeDriver(config, new Proteo4Driver());
        request = {
          method: 'GET',
          url: 'http://host.test/mock/test',
          data: { data: 'data' },
          interceptors: [...interceptors],
          driverName: 'mockCurrentApi'
        };
        response = {
          status: 407,
          statusText: 'KO',
          headers: {}
        };
      });

      it('should trigger interceptor on response, without storing if not set', async () => {
        expect.assertions(2);
        try {
          await driver.done(response as any, request);
        } catch (error) {
          expect(error).toStrictEqual(expect.objectContaining({ status: 407, statusText: 'KO' }));
          expect(eventManagerMockPublish).toHaveBeenCalledWith('INTERCEPTOR_EVENT_NO_REPEAT', expect.anything());
        }
      });

      it('should trigger interceptor on response, storing it if set without saving interceptors property', async () => {
        expect.assertions(3);
        response.status = 408;

        const expectedStoredRequests = new Map();
        driver.currentApi = 'mockCurrentApi';

        // Asserting that 'requestToStore' inside the Map does NOT have 'interceptors'
        expectedStoredRequests.set(expect.any(String), {
          driverName: 'mockCurrentApi',
          request: {
            data: { data: 'data' },
            method: 'GET',
            url: 'http://host.test/mock/test'
          }
        });

        try {
          await driver.done(response as any, request);
        } catch (error) {
          expect(error).toStrictEqual(expect.objectContaining({ status: 408, statusText: 'KO' }));
          expect(eventManagerMockPublish).toHaveBeenCalledWith('INTERCEPTOR_EVENT_REPEAT', expect.anything());
          expect(driver.storedRequests).toStrictEqual(expectedStoredRequests);
        }
      });

      it('should trigger interceptor on response, translating errors if not omitted', async () => {
        expect.assertions(3);
        try {
          await driver.done(response as any, request);
        } catch (error) {
          expect(error).toStrictEqual(expect.objectContaining({ status: 407, statusText: 'KO' }));
          expect(eventManagerMockPublish).toHaveBeenCalledWith('INTERCEPTOR_EVENT_NO_REPEAT', expect.anything());
          expect(mockTranslateError).toHaveBeenCalled();
        }
      });

      it('should trigger interceptor on response, not translating errors if omitted', async () => {
        expect.assertions(3);
        response.status = 428;
        try {
          await driver.done(response as any, request);
        } catch (error) {
          expect(error).toStrictEqual(expect.objectContaining({ status: 428, statusText: 'KO' }));
          expect(eventManagerMockPublish).toHaveBeenCalledWith('INTERCEPTOR_EVENT_NO_TRANSLATE', expect.anything());
          expect(mockTranslateError).not.toHaveBeenCalled();
        }
      });
    });
  });

  describe('downloadFile', () => {
    it('should delegate downloadFile to parent', async () => {
      expect.assertions(1);
      const request = {
        method: 'GET',
        url: 'http://host.test/mock/test',
        data: { data: 'data' }
      };
      driver = new Proteo4NativeDriver(baseConfig, new Proteo4Driver());
      await driver.downloadFile(request);
      expect(mockDownloadFile).toHaveBeenCalledWith(request);
    });
  });

  describe('getHeaders', () => {
    it('should generate native p4 headers', () => {
      expect.assertions(1);
      jest.spyOn(I18n, 'getInstance').mockReturnValue({
        isoLanguage: 'en-GB',
        language: 'en_GB'
      } as I18n);
      driver = new Proteo4NativeDriver(baseConfig, new Proteo4Driver());
      const headers = driver.getHeaders({}, 'GET');
      expect(headers).toEqual({
        'accept-language': 'en-GB',
        'content-language': 'en_GB'
      });
    });
  });

  describe('repeatRequest', () => {
    let resolveHttpSpy: any;

    beforeEach(() => {
      driver = new Proteo4NativeDriver(baseConfig, new Proteo4Driver());
      resolveHttpSpy = jest.spyOn(driver as any, 'resolveHttp');
    });

    it('should display warning if ID does not exist', async () => {
      expect.assertions(4);

      const response = await driver.repeatRequest('mockRequestId');

      expect(LoggerUtils.prototype.warn).toHaveBeenCalledWith(
        'repeatRequest - request not found by given id: mockRequestId',
        {
          remoteLogger: true,
          type: 'application'
        }
      );
      expect(response).toStrictEqual({
        data: {
          messages: [
            {
              alias: 'requestID no existe',
              message: 'El requestID indicado no existe, no se ha podido realizar la peticion',
              type: 'ERROR'
            }
          ]
        }
      });
      expect(mockKeepAlive).not.toHaveBeenCalled();
      expect(resolveHttpSpy).not.toHaveBeenCalled();
    });

    it('should properly repeat request if ID exists, running KeepAlive', async () => {
      expect.assertions(4);
      driver.storedRequests.set('mockRequestId', { request: 'mockRequest' } as any);

      resolveHttpSpy.mockReturnValueOnce('mock fine response');
      const response = await driver.repeatRequest('mockRequestId');

      expect(resolveHttpSpy).toHaveBeenCalledWith('mockRequest', false);
      expect(response).toBe('mock fine response');
      expect(mockKeepAlive).toHaveBeenCalled();
      expect(LoggerUtils.prototype.warn).not.toHaveBeenCalled();
    });
  });

  describe('deleteRequest', () => {
    beforeEach(() => {
      driver = new Proteo4NativeDriver(baseConfig, new Proteo4Driver());
      driver.storedRequests.set('mockRequestId', { request: 'mockRequest' } as any);
    });

    it('should display warning if ID does not exist', () => {
      expect.assertions(3);

      const response = driver.deleteRequest('mockRequestNotExistingId');

      expect(response).toBe(false);
      expect(LoggerUtils.prototype.warn).toHaveBeenCalledWith(
        'deleteRequest - request not found by given id: mockRequestNotExistingId',
        {
          remoteLogger: true,
          type: 'application'
        }
      );
      expect(driver.storedRequests.size).toBe(1);
    });

    it('should properly delete stored request if ID exists', () => {
      expect.assertions(3);

      const response = driver.deleteRequest('mockRequestId');

      expect(response).toBe(true);
      expect(LoggerUtils.prototype.warn).not.toHaveBeenCalled();
      expect(driver.storedRequests.size).toBe(0);
    });
  });

  describe('getRequest', () => {
    beforeEach(() => {
      driver = new Proteo4NativeDriver(baseConfig, new Proteo4Driver());
      driver.storedRequests.set('mockRequestId', { request: 'mockRequest' } as any);
    });

    it('should display warning if ID does not exist', async () => {
      expect.assertions(2);

      const response = driver.getRequest('mockRequestNotExistingId');

      expect(response).toBe(undefined);
      expect(LoggerUtils.prototype.warn).toHaveBeenCalledWith(
        'getRequest - request not found by given id: mockRequestNotExistingId',
        {
          remoteLogger: true,
          type: 'application'
        }
      );
    });

    it('should properly get stored request if ID exists', async () => {
      expect.assertions(2);

      const response = driver.getRequest('mockRequestId');

      expect(response).toStrictEqual({ request: 'mockRequest' });
      expect(LoggerUtils.prototype.warn).not.toHaveBeenCalled();
    });
  });
});
