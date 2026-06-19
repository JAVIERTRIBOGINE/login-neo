/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type {
  AuthorizationTokens,
  DataManagerExtendedRequest,
  DataManagerRequest,
  DriverConfiguration,
  DriverInterceptor
} from '@proteo/types';
import type { FetchMock } from 'jest-fetch-mock';
import fetch from 'jest-fetch-mock';
import { LoggerUtils } from '@proteo/logger-utils';
import { KeepAlive } from '@proteo/keep-alive';
import { I18n } from '@proteo/i18n-utils';
import { EventManager } from '@proteo/event-bus';

const fetchMock = fetch as unknown as FetchMock;

fetchMock.enableMocks();

jest.useFakeTimers();

const mockP4GetHeaders = jest.fn().mockImplementation(() => ({}));
const mockGenericDriverConstructor = jest.fn();
const mockProteo4DriverConstructor = jest.fn();
const mockDownloadFile = jest.fn();
const mockSetAuthorization = jest.fn();
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
    setAuthorization = mockSetAuthorization;
    responseReceivedLog = mockResponseReceivedLog;
  },
  DATA_MANAGER_ERROR: 'bsDataManagerError',
  REFRESH_RETRIES: 10
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

jest.unstable_mockModule('@proteo/data-manager-utils', () => ({
  repeatRequestError: [
    {
      alias: 'requestID no existe',
      message: 'El requestID indicado no existe, no se ha podido realizar la peticion',
      type: 'ERROR'
    }
  ]
}));

const mockKeepAlive = jest.fn();
const keepAliveMockGetInstance: jest.MockedFunction<typeof KeepAlive.getInstance> = jest
  .fn()
  .mockImplementation(() => ({
    keepAlive: mockKeepAlive
  })) as jest.MockedFunction<typeof KeepAlive.getInstance>;
KeepAlive.getInstance = keepAliveMockGetInstance;

const eventManagerMockPublish: jest.MockedFunction<typeof EventManager.prototype.publish> =
  jest.fn() as jest.MockedFunction<typeof EventManager.prototype.publish>;

const eventManagerMockGetInstance: jest.MockedFunction<typeof EventManager.getInstance> = jest
  .fn()
  .mockImplementation(() => ({
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

const tokens: AuthorizationTokens = {
  OIDC: 'oidcToken',
  OAUTH: 'oauthToken'
};

const mockRefreshTokens = jest.fn().mockResolvedValue(tokens as never);

jest.unstable_mockModule('@proteo/refresh-tokens-utils', () => ({
  refreshTokens: mockRefreshTokens
}));

describe('proteo4-web-driver', () => {
  let Proteo4Driver: any;
  let Proteo4WebDriver: any;
  let driver: typeof Proteo4WebDriver;

  beforeEach(async () => {
    ({ Proteo4Driver } = await import('../proteo4-driver.js'));
    ({ Proteo4WebDriver } = await import('../proteo4-web-driver.js'));
    LoggerUtils.prototype.error = jest.fn();
    LoggerUtils.prototype.warn = jest.fn();
    LoggerUtils.prototype.debug = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    fetchMock.resetMocks();
  });

  describe('constructor', () => {
    it('should call parent constructor', () => {
      expect.assertions(2);
      expect(new Proteo4WebDriver(baseConfig)).toBeInstanceOf(Proteo4WebDriver);
      expect(mockGenericDriverConstructor).toHaveBeenCalled();
    });

    it('should include interceptors if set in config', () => {
      expect.assertions(1);

      const config = { ...baseConfig, interceptors };
      driver = new Proteo4WebDriver(config);
      expect(driver.interceptors).toStrictEqual(interceptors);
    });

    it('should self assign parent driver if set', () => {
      expect.assertions(2);
      driver = new Proteo4WebDriver(baseConfig, new Proteo4Driver());
      expect(mockProteo4DriverConstructor).toHaveBeenCalled();
      expect(driver.parent).toBeInstanceOf(Proteo4Driver);
    });
  });

  describe('http', () => {
    let doneSpy = jest.fn();
    let request: DataManagerRequest;

    beforeEach(() => {
      doneSpy = jest.spyOn(Proteo4WebDriver.prototype, 'cleanErrorsDone') as any;
      driver = new Proteo4WebDriver(baseConfig, new Proteo4Driver());
      request = {
        method: 'POST',
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
      expect(mockP4GetHeaders).toHaveBeenCalledTimes(2);
      expect(mockBasicHttpOperations).toHaveBeenCalledTimes(1);
    });

    it('should send headers obtained from parent getHeaders', async () => {
      expect.assertions(2);
      mockP4GetHeaders.mockReturnValueOnce({ customHeader: 'customValue' });
      mockP4GetHeaders.mockReturnValueOnce({ customHeader: 'customValue' });
      const response = await driver.http(request);
      expect(fetchMock).toHaveBeenCalledWith('http://host.test/mock/test', {
        body: JSON.stringify({ data: 'data' }),
        credentials: 'include',
        headers: expect.objectContaining({ customHeader: 'customValue' }),
        method: 'POST',
        redirect: 'follow'
      });
      expect(response).toBe('mocked response');
    });

    it('should include Content-Type header with application/json when body is JSON', async () => {
      expect.assertions(1);
      await driver.http(request);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://host.test/mock/test',
        expect.objectContaining({
          body: JSON.stringify({ data: 'data' }),
          headers: expect.objectContaining({ 'Content-Type': 'application/json' })
        })
      );
    });

    it('should NOT include Content-Type header with application/json when body is FormData', async () => {
      expect.assertions(1);
      const formData = new FormData();
      formData.append('data', 'mockData');
      request.data = formData;
      await driver.http(request);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://host.test/mock/test',
        expect.objectContaining({
          body: formData,
          headers: expect.not.objectContaining({ 'Content-Type': 'application/json' })
        })
      );
    });

    it('should call done with response from fetch', async () => {
      expect.assertions(1);
      fetchMock.mockResponseOnce(JSON.stringify({ data: 'mockedResponseData' }));
      const response: Response = new Response(
        JSON.stringify({
          data: 'mockedResponseData'
        }),
        {
          status: 200,
          statusText: 'OK',
          headers: {
            'Content-Type': 'text/plain;charset=UTF-8'
          }
        }
      );
      await driver.http(request);
      expect(doneSpy).toHaveBeenCalledWith(response, request, false);
    });

    it('should not resolve http call immediately if refresh token process is in progress', async () => {
      expect.assertions(3);
      const resolveHttpSpy = jest.spyOn(driver, 'resolveHttp');
      driver.refreshTokenProcess = true;
      driver.http(request);
      expect(fetchMock).not.toHaveBeenCalled();
      driver.refreshTokenProcess = false;
      await jest.runAllTimersAsync();
      expect(fetchMock).toHaveBeenCalled();
      expect(resolveHttpSpy).toHaveBeenCalledTimes(2);
    });

    it('should dispatch an event if fetch fails', async () => {
      expect.assertions(2);
      fetchMock.mockRejectOnce({ data: 'mockFetchError' } as unknown as Error);
      const dispatchEventSpy = jest.spyOn(document, 'dispatchEvent');
      try {
        await driver.http(request);
      } catch (error) {
        expect(error).toStrictEqual({ data: 'mockFetchError' });
        expect(dispatchEventSpy).toHaveBeenCalledWith(
          new CustomEvent<string>('bsDataManagerError', { detail: 'mockFetchError' })
        );
      }
    });
  });

  describe('done', () => {
    let headers: Headers;
    let response: Response;
    let request: DataManagerExtendedRequest;
    let resolveHttpSpy = jest.fn();

    beforeEach(() => {
      driver = new Proteo4WebDriver(baseConfig, new Proteo4Driver());
      resolveHttpSpy = jest.spyOn(driver, 'resolveHttp') as any;
      request = {
        method: 'GET',
        url: 'http://host.test/mock/test',
        data: { data: 'data' }
      };
      headers = new Headers();
      headers.append('Content-Type', 'application/json');
      response = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: headers,
        url: '',
        redirected: false
      } as Response;
      resolveHttpSpy.mockReturnValue('resolveHttp response');
    });

    it('should process basic ok GET response properly', async () => {
      expect.assertions(1);
      const driverResponse = await driver.done(response, request);
      expect(driverResponse).toStrictEqual(expect.objectContaining({ status: 200, statusText: 'OK' }));
    });

    it('should process basic ok GET response with json data properly', async () => {
      expect.assertions(1);
      response = new Response(JSON.stringify({ noData: 'mockNoData' }), {
        status: 200,
        statusText: 'OK',
        headers: headers
      });
      const driverResponse = await driver.done(response, request);
      expect(driverResponse).toStrictEqual(expect.objectContaining({ status: 200, statusText: 'OK' }));
    });

    it('should process basic ok POST response properly', async () => {
      expect.assertions(1);
      request.method = 'POST';
      response = new Response(JSON.stringify({ data: 'mockData' }), {
        status: 200,
        statusText: 'OK',
        headers: headers
      });
      const driverResponse = await driver.done(response, request);
      expect(driverResponse).toStrictEqual(
        expect.objectContaining({ data: 'mockData', status: 200, statusText: 'OK' })
      );
    });

    describe('error cases', () => {
      it('should process basic error response', async () => {
        expect.assertions(3);
        response = new Response(
          JSON.stringify({
            messages: [
              {
                alias: 'mockErrorAlias',
                type: 'ERROR'
              }
            ]
          }),
          {
            status: 500,
            statusText: 'KO',
            headers: headers
          }
        );
        try {
          await driver.done(response, request);
        } catch (error) {
          expect(error).toStrictEqual(expect.objectContaining({ status: 500, statusText: 'KO' }));
          expect(mockTranslateError).toHaveBeenCalled();
          expect(LoggerUtils.prototype.debug).not.toHaveBeenCalled();
        }
      });

      it('should omit translateErrors if explicitly set', async () => {
        expect.assertions(3);
        response = new Response(
          JSON.stringify({
            messages: [
              {
                alias: 'mockErrorAlias',
                type: 'ERROR'
              }
            ]
          }),
          {
            status: 500,
            statusText: 'KO',
            headers: headers
          }
        );
        try {
          await driver.cleanErrorsDone(response, request, true);
        } catch (error) {
          expect(error).toStrictEqual(expect.objectContaining({ status: 500, statusText: 'KO' }));
          expect(mockTranslateError).not.toHaveBeenCalled();
          expect(LoggerUtils.prototype.debug).not.toHaveBeenCalled();
        }
      });

      it('should log if error response is not properly formed', async () => {
        expect.assertions(3);
        response = new Response(
          JSON.stringify({
            notMessages: [
              {
                alias: 'mockErrorAlias',
                type: 'ERROR'
              }
            ]
          }),
          {
            status: 500,
            statusText: 'KO',
            headers: headers
          }
        );
        try {
          await driver.done(response, request);
        } catch (error) {
          expect(error).toStrictEqual(expect.objectContaining({ status: 500, statusText: 'KO' }));
          expect(mockTranslateError).toHaveBeenCalled();
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

      it('should manage tokens expired error properly under retries limit', async () => {
        expect.assertions(4);
        response = new Response(
          JSON.stringify({
            messages: [
              {
                alias: 'TOKEN_EXPIRED',
                type: 'ERROR'
              }
            ]
          }),
          {
            status: 500,
            statusText: 'KO',
            headers: headers
          }
        );
        const driverResponse = await driver.done(response, request);
        expect(driverResponse).toBe('resolveHttp response');
        expect(mockRefreshTokens).toHaveBeenCalled();
        expect(mockSetAuthorization).toHaveBeenCalled();
        expect(LoggerUtils.prototype.debug).not.toHaveBeenCalled();
      });

      it('should directly call resolveHttp if token refresh is in progress for tokens expired error', async () => {
        expect.assertions(4);
        response = new Response(
          JSON.stringify({
            messages: [
              {
                alias: 'TOKEN_EXPIRED',
                type: 'ERROR'
              }
            ]
          }),
          {
            status: 500,
            statusText: 'KO',
            headers: headers
          }
        );
        driver.refreshTokenProcess = true;
        const driverResponse = await driver.done(response, request);
        expect(driverResponse).toBe('resolveHttp response');
        expect(mockRefreshTokens).not.toHaveBeenCalled();
        expect(mockSetAuthorization).not.toHaveBeenCalled();
        expect(LoggerUtils.prototype.debug).not.toHaveBeenCalled();
      });

      it('should handle refreshTokens error', async () => {
        expect.assertions(4);
        response = new Response(
          JSON.stringify({
            messages: [
              {
                alias: 'TOKEN_EXPIRED',
                type: 'ERROR'
              }
            ]
          }),
          {
            status: 500,
            statusText: 'KO',
            headers: headers
          }
        );
        mockRefreshTokens.mockRejectedValueOnce('mockRefreshTokensError' as never);
        const driverResponse = await driver.done(response, request);
        expect(driverResponse).toBe('resolveHttp response');
        expect(mockRefreshTokens).toHaveBeenCalled();
        expect(mockSetAuthorization).not.toHaveBeenCalled();
        expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith(
          'Data Manager refresh token error: ',
          'mockRefreshTokensError',
          {
            remoteLogger: true,
            type: 'application'
          }
        );
      });
    });

    describe('interceptors', () => {
      beforeEach(() => {
        const config = { ...baseConfig, interceptors };
        driver = new Proteo4WebDriver(config, new Proteo4Driver());
        request = {
          method: 'GET',
          url: 'http://host.test/mock/test',
          data: { data: 'data' },
          interceptors: [...interceptors],
          driverName: 'mockCurrentApi'
        };
        response = new Response(JSON.stringify({ data: 'mockData' }), {
          status: 407,
          statusText: 'KO',
          headers: {}
        });
      });

      it('should trigger interceptor on response, without storing if not set', async () => {
        expect.assertions(2);
        try {
          await driver.done(response, request);
        } catch (error) {
          expect(error).toStrictEqual(expect.objectContaining({ status: 407, statusText: 'KO' }));
          expect(eventManagerMockPublish).toHaveBeenCalledWith('INTERCEPTOR_EVENT_NO_REPEAT', expect.anything());
        }
      });

      it('should display a warning if response has no json body, but still send the event', async () => {
        expect.assertions(3);
        try {
          response = new Response(null, {
            status: 407,
            statusText: 'KO',
            headers: {}
          });
          await driver.done(response, request);
        } catch (error) {
          expect(error).toStrictEqual(expect.objectContaining({ status: 407, statusText: 'KO' }));
          expect(LoggerUtils.prototype.warn).toHaveBeenCalledWith(
            '[Proteo4WebDriver] intercepted request without proper body'
          );
          expect(eventManagerMockPublish).toHaveBeenCalledWith('INTERCEPTOR_EVENT_NO_REPEAT', expect.anything());
        }
      });

      it('should trigger interceptor on response, storing it if set', async () => {
        expect.assertions(3);
        response = new Response(JSON.stringify({ data: 'mockData' }), {
          status: 408,
          statusText: 'KO',
          headers: {}
        });
        const expectedStoredRequests = new Map();
        driver.currentApi = 'mockCurrentApi';
        expectedStoredRequests.set(expect.any(String), {
          driverName: 'mockCurrentApi',
          request: {
            data: { data: 'data' },
            method: 'GET',
            url: 'http://host.test/mock/test'
          }
        });
        try {
          await driver.done(response, request);
        } catch (error) {
          expect(error).toStrictEqual(expect.objectContaining({ status: 408, statusText: 'KO' }));
          expect(eventManagerMockPublish).toHaveBeenCalledWith('INTERCEPTOR_EVENT_REPEAT', expect.anything());
          expect(driver.storedRequests).toStrictEqual(expectedStoredRequests);
        }
      });

      it('should trigger interceptor on response, translating errors if not omitted', async () => {
        expect.assertions(3);
        try {
          await driver.done(response, request);
        } catch (error) {
          expect(error).toStrictEqual(expect.objectContaining({ status: 407, statusText: 'KO' }));
          expect(eventManagerMockPublish).toHaveBeenCalledWith('INTERCEPTOR_EVENT_NO_REPEAT', expect.anything());
          expect(mockTranslateError).toHaveBeenCalled();
        }
      });

      it('should trigger interceptor on response, not translating errors if omitted', async () => {
        expect.assertions(3);
        response = new Response(JSON.stringify({ data: 'mockData' }), {
          status: 428,
          statusText: 'KO',
          headers: {}
        });
        try {
          await driver.done(response, request);
        } catch (error) {
          expect(error).toStrictEqual(expect.objectContaining({ status: 428, statusText: 'KO' }));
          expect(eventManagerMockPublish).toHaveBeenCalledWith('INTERCEPTOR_EVENT_NO_TRANSLATE', expect.anything());
          expect(mockTranslateError).not.toHaveBeenCalled();
        }
      });
    });
  });

  describe('getHeaders', () => {
    beforeEach(() => {
      jest.spyOn(I18n, 'getInstance').mockReturnValue({
        isoLanguage: 'en-GB',
        language: 'en_GB'
      } as I18n);
      driver = new Proteo4WebDriver(baseConfig, new Proteo4Driver());
      driver.authorizationTokens = tokens;
    });

    it('should generate web p4 headers for GET method properly', () => {
      expect.assertions(1);
      const headers = driver.getHeaders({}, 'GET');
      expect(headers).toEqual({
        'accept-language': 'en-GB',
        authorization: 'Bearer oauthToken',
        'x-auth': 'oidcToken'
      });
    });

    it('should generate web p4 headers for POST method properly', () => {
      expect.assertions(1);
      const headers = driver.getHeaders({}, 'POST');
      expect(headers).toEqual({
        'accept-language': 'en-GB',
        'content-language': 'en_GB',
        authorization: 'Bearer oauthToken',
        'x-auth': 'oidcToken'
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
      driver = new Proteo4WebDriver(baseConfig, new Proteo4Driver());
      await driver.downloadFile(request);
      expect(mockDownloadFile).toHaveBeenCalledWith(request);
    });
  });

  describe('repeatRequest', () => {
    let resolveHttpSpy: any;

    beforeEach(() => {
      driver = new Proteo4WebDriver(baseConfig, new Proteo4Driver());
      resolveHttpSpy = jest.spyOn(driver, 'resolveHttp');
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
      driver.storedRequests.set('mockRequestId', { request: 'mockRequest' });

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
      driver = new Proteo4WebDriver(baseConfig, new Proteo4Driver());
      driver.storedRequests.set('mockRequestId', { request: 'mockRequest' });
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
      driver = new Proteo4WebDriver(baseConfig, new Proteo4Driver());
      driver.storedRequests.set('mockRequestId', { request: 'mockRequest' });
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
