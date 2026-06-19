/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';
import type {
  DataManagerRequest,
  DataManagerResponse,
  DataManagerResponseError,
  DataManagerResponseErrors,
  DriverConfiguration
} from '@proteo/types';
import { LoggerUtils } from '@proteo/logger-utils';
import type { MockInstance } from 'jest-mock';
import { getCookie } from '@proteo/cookie-utils';
import { DataManagerDriver, GenericDriver } from '@proteo/data-manager-driver';

//jest.useFakeTimers();

const config: DriverConfiguration = {
  host: 'http://host.test',
  baseUrl: 'mock/test',
  name: 'test'
};

const setAuthorizationMock = jest.fn();
const clearTokensMock = jest.fn();
// const hasTokensMock = jest.fn();
const setupMock = jest.fn();
const httpMock = jest.fn();
const doneMock = jest.fn();
const getHeadersMock = jest.fn();
const repeatRequestMock = jest.fn();
const deleteRequestMock = jest.fn();
const getRequestMock = jest.fn();
const mockDriver = {
  setAuthorization: setAuthorizationMock,
  clearTokens: clearTokensMock,
  get getHasTokens() {
    return 'mock';
  },
  setup: setupMock,
  http: httpMock,
  done: doneMock,
  getHeaders: getHeadersMock,
  repeatRequest: repeatRequestMock,
  deleteRequest: deleteRequestMock,
  getRequest: getRequestMock
};
const mockProteo4NativeDriver = jest.fn().mockImplementation(() => mockDriver);
jest.unstable_mockModule('../proteo4-native-driver', () => ({ Proteo4NativeDriver: mockProteo4NativeDriver }));

const mockProteo4WebDriver = jest.fn().mockImplementation(() => mockDriver);
jest.unstable_mockModule('../proteo4-web-driver', () => ({ Proteo4WebDriver: mockProteo4WebDriver }));

const mockClassifyErrors = jest.fn();
const mockConvertLegacyToP4Errors = jest.fn();
let mockLegacyGenericErrors: any[] = [
  {
    errorMessage: 'Algo no ha ido bien',
    code: 'F00000',
    errorMessageTitle: '¡Vaya! Algo no ha ido bien...',
    errorMessageDetail: 'Lo sentimos, algo no ha ido bien.',
    severity: 'FATAL'
  }
];
const mockValidateErrorFormat = jest.fn();
jest.unstable_mockModule('@proteo/data-manager-utils', () => ({
  classifyErrors: mockClassifyErrors,
  convertLegacyToP4Errors: mockConvertLegacyToP4Errors,
  legacyGenericErrors: mockLegacyGenericErrors,
  validateErrorFormat: mockValidateErrorFormat,
  combineURLs: jest.fn(),
  getParams: jest.fn()
}));

const mockSendError = jest.fn();
jest.unstable_mockModule('@proteo/error-management-utils', () => ({
  sendError: mockSendError
}));

const mockNative = jest.fn().mockImplementation(() => true);
const mockIsMobile = jest.fn().mockImplementation(() => false);
const mockIsWebContainer = jest.fn().mockImplementation(() => false);
const mockIsJxBrowser = jest.fn().mockImplementation(() => false);
jest.unstable_mockModule('@proteo/platform-utils', () => ({
  isNative: mockNative,
  isJxBrowser: mockIsJxBrowser,
  isMobile: mockIsMobile,
  isWebContainer: mockIsWebContainer
}));

const mockGetCookie: jest.MockedFunction<typeof getCookie> = jest.fn() as jest.MockedFunction<typeof getCookie>;
jest.unstable_mockModule('@proteo/cookie-utils', () => ({
  getCookie: mockGetCookie
}));

LoggerUtils.prototype.error = jest.fn();
LoggerUtils.prototype.warn = jest.fn();
LoggerUtils.prototype.debug = jest.fn();

jest.spyOn(global, 'setTimeout').mockImplementation((callback): any => {
  callback();
});

describe('proteo4-driver', () => {
  // const headers = { headers: { 'content-type': 'application/json' } };
  let Proteo4Driver: any;
  let driver: typeof Proteo4Driver;
  let hasTokensSpy: MockInstance<any>;
  let genGetHeadersSpy: any;

  beforeEach(async () => {
    // KeepAlive.initInstance();
    // ({ isNative } = await import('@proteo/platform-utils'));
    await import('../proteo4-web-driver');
    await import('../proteo4-native-driver');
    ({ Proteo4Driver } = await import('../proteo4-driver'));
    driver = new Proteo4Driver(config);
    (global as any).bsmbridge = undefined;
    (global as any).webkit = undefined;
    hasTokensSpy = jest.spyOn(mockDriver, 'getHasTokens', 'get');
    genGetHeadersSpy = jest.spyOn(GenericDriver.prototype, 'getHeaders');
    genGetHeadersSpy.mockImplementation((headers: any, _method: any) => headers);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create a native driver instance on mobile devices', async () => {
      expect.assertions(1);
      expect(mockProteo4NativeDriver).toHaveBeenCalledTimes(1);
    });

    it('should create a http driver instance on browser', () => {
      expect.assertions(1);
      mockNative.mockReturnValueOnce(false);
      new Proteo4Driver(config);
      expect(mockProteo4WebDriver).toHaveBeenCalledTimes(1);
    });
  });

  describe('setAuthorization', () => {
    it('should call setAuthorization instance function', () => {
      expect.assertions(1);
      const authorizationTokens = {
        OIDC: 'OICD',
        OAUTH: 'OAUTH'
      };
      driver.setAuthorization(authorizationTokens);
      expect(setAuthorizationMock).toHaveBeenCalledWith(authorizationTokens);
    });
  });

  describe('clearTokens', () => {
    it('should call clearTokens instance function', () => {
      expect.assertions(1);
      driver.clearTokens();
      expect(clearTokensMock).toHaveBeenCalled();
    });
  });

  describe('hasTokens', () => {
    it('should call hasTokens instance function', async () => {
      expect.assertions(1);
      driver.hasTokens();
      expect(hasTokensSpy).toHaveBeenCalled();
    });
  });

  describe('getHeaders', () => {
    it('should retrieve mobile headers and call getHeaders instance function', () => {
      expect.assertions(2);
      const header = {};
      const method = 'GET';
      mockGetCookie.mockReturnValueOnce('iPhone');
      mockIsMobile.mockReturnValueOnce(true);
      driver.getHeaders(header, method);
      expect(genGetHeadersSpy).toHaveBeenCalled();
      expect(getHeadersMock).toHaveBeenCalledWith(
        {
          'x-channel-origin': 'MOBILE',
          'x-client-product': 'BSM',
          'x-device-token-cookie': 'iPhone'
        },
        method
      );
    });

    it('should also retrieve webContainer headers', () => {
      expect.assertions(2);
      const header = {};
      const method = 'GET';
      mockIsWebContainer.mockReturnValueOnce(true);
      mockNative.mockReturnValueOnce(false);
      driver.getHeaders(header, method);
      expect(genGetHeadersSpy).toHaveBeenCalled();
      expect(getHeadersMock).toHaveBeenCalledWith(
        {
          'x-channel-origin': 'WEB',
          'x-client-product': 'BSO'
        },
        method
      );
    });

    it('should also retrieve JxBrowser headers', () => {
      expect.assertions(2);
      const header = {};
      const method = 'GET';
      mockIsJxBrowser.mockReturnValueOnce(true);
      mockNative.mockReturnValueOnce(false);
      driver.getHeaders(header, method);
      expect(genGetHeadersSpy).toHaveBeenCalled();
      expect(getHeadersMock).toHaveBeenCalledWith(
        {
          'x-channel-origin': 'BRANCH'
        },
        method
      );
    });
  });

  describe('downloadFile', () => {
    //const headers = { headers: { 'content-type': 'application/json' } };
    let request: DataManagerRequest;
    let okHttpResponse: DataManagerResponse<unknown>;
    let koHttpResponse: DataManagerResponse<unknown>;

    beforeEach(() => {
      request = {
        url: '/document-library-storage/v1/download-link',
        method: 'POST',
        data: {
          visibility: 'public',
          fileStore: 'netapp',
          fileId: 'demo-235'
        },
        channel: 'digital',
        contentType: 'application/json'
      };
      okHttpResponse = {
        status: 200,
        statusText: '',
        headers: { 'content-disposition': 'attachment; filename="example.pdf"' },
        redirected: false,
        url: '',
        data: {
          downloadId: '3243244',
          downloadLink: 'example/3243244'
        }
      };
      koHttpResponse = {
        status: 400,
        statusText: '',
        headers: { header1: 'header' },
        redirected: false,
        url: '',
        data: {
          messages: [
            {
              alias: 'mockAlias',
              message: 'mockMessage',
              type: 'ERROR'
            }
          ]
        }
      };
    });

    it('should return Error data when downloadFile is called without channel parameter', async () => {
      expect.assertions(3);
      const response = {
        messages: [
          {
            alias: 'Internal Server Error',
            message: 'Internal Server Error',
            type: 'ERROR'
          }
        ]
      };
      const request: DataManagerRequest = {
        url: '/document-library-storage/v1/download-link',
        method: 'POST',
        data: {
          visibility: 'public',
          fileStore: 'netapp',
          fileId: 'demo-235'
        },
        contentType: 'application/json'
      };
      const driver = new Proteo4Driver();
      const spyDownloadFile = jest.spyOn(driver, 'downloadFile');
      try {
        await driver.downloadFile(request);
      } catch (error) {
        expect(spyDownloadFile).toHaveBeenCalled();
        expect(error).toEqual(response);
        expect(LoggerUtils.prototype.error).toHaveBeenCalledWith('Channel parameter not provided', {
          remoteLogger: true,
          type: 'application'
        });
      }
    });

    it('should return Error data when downloadFile is called and first call to http function fails', async () => {
      expect.assertions(3);
      const koHttpResponse: DataManagerResponse<unknown> = {
        status: 500,
        statusText: '',
        headers: { header1: 'header' },
        redirected: false,
        url: '',
        data: {}
      };
      const driver = new Proteo4Driver();
      const spyDownloadFile = jest.spyOn(driver, 'downloadFile');
      const spyhttp = jest.spyOn(driver, 'http').mockRejectedValue(koHttpResponse);
      try {
        await driver.downloadFile(request);
      } catch (error) {
        expect(spyDownloadFile).toHaveBeenCalled();
        expect(spyhttp).toHaveBeenCalled();
        expect(LoggerUtils.prototype.error).toHaveBeenCalledWith('Internal Server Error', {
          remoteLogger: true,
          type: 'application'
        });
      }
    });

    it('should return Error data when downloadFile fails with downloadLinkBrokenException exception', async () => {
      expect.assertions(4);
      const driver = new Proteo4Driver();
      (koHttpResponse.data as any).messages[0].alias = 'downloadLinkBrokenException';
      const spyDownloadFile = jest.spyOn(driver, 'downloadFile');
      const spyHttp = jest.spyOn(driver, 'http');
      spyHttp.mockRejectedValue(koHttpResponse);
      spyHttp.mockResolvedValueOnce(okHttpResponse);
      try {
        await driver.downloadFile(request);
      } catch (error) {
        expect(spyDownloadFile).toHaveBeenCalled();
        expect(spyHttp).toHaveBeenCalled();
        expect(LoggerUtils.prototype.error).toHaveBeenCalledWith('Internal Server Error', {
          remoteLogger: true,
          type: 'application'
        });
        expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith('[downloadFile] downloadLinkBrokenException', {
          remoteLogger: true,
          type: 'application'
        });
      }
    });

    it('should return Error data when downloadFile fails with downloadLinkExpiredException exception', async () => {
      expect.assertions(4);
      const driver = new Proteo4Driver();
      (koHttpResponse.data as any).messages[0].alias = 'downloadLinkExpiredException';
      const spyDownloadFile = jest.spyOn(driver, 'downloadFile');
      const spyHttp = jest.spyOn(driver, 'http');
      spyHttp.mockRejectedValue(koHttpResponse);
      spyHttp.mockResolvedValueOnce(okHttpResponse);
      try {
        await driver.downloadFile(request);
      } catch (error) {
        expect(spyDownloadFile).toHaveBeenCalled();
        expect(spyHttp).toHaveBeenCalled();
        expect(LoggerUtils.prototype.error).toHaveBeenCalledWith('Internal Server Error', {
          remoteLogger: true,
          type: 'application'
        });
        expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith('[downloadFile] downloadLinkExpiredException', {
          remoteLogger: true,
          type: 'application'
        });
      }
    });

    it('should return Error data when downloadFile fails with downloadLinkAlreadyVisited exception', async () => {
      expect.assertions(4);
      const driver = new Proteo4Driver();
      (koHttpResponse.data as any).messages[0].alias = 'downloadLinkAlreadyVisited';
      const spyDownloadFile = jest.spyOn(driver, 'downloadFile');
      const spyHttp = jest.spyOn(driver, 'http');
      spyHttp.mockRejectedValue(koHttpResponse);
      spyHttp.mockResolvedValueOnce(okHttpResponse);
      try {
        await driver.downloadFile(request);
      } catch (error) {
        expect(spyDownloadFile).toHaveBeenCalled();
        expect(spyHttp).toHaveBeenCalled();
        expect(LoggerUtils.prototype.error).toHaveBeenCalledWith('Internal Server Error', {
          remoteLogger: true,
          type: 'application'
        });
        expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith('[downloadFile] downloadLinkAlreadyVisited', {
          remoteLogger: true,
          type: 'application'
        });
      }
    });

    it('should return Error data when downloadFile fails with unexpected exception', async () => {
      expect.assertions(4);
      const driver = new Proteo4Driver();
      (koHttpResponse.data as any).messages[0].alias = 'mockUnexpected';
      const spyDownloadFile = jest.spyOn(driver, 'downloadFile');
      const spyHttp = jest.spyOn(driver, 'http');
      spyHttp.mockRejectedValue(koHttpResponse);
      spyHttp.mockResolvedValueOnce(okHttpResponse);
      try {
        await driver.downloadFile(request);
      } catch (error) {
        expect(spyDownloadFile).toHaveBeenCalled();
        expect(spyHttp).toHaveBeenCalled();
        expect(LoggerUtils.prototype.error).toHaveBeenCalledWith('Internal Server Error', {
          remoteLogger: true,
          type: 'application'
        });
        expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith(
          "[downloadFile] unexpected error code: 'mockUnexpected'",
          {
            remoteLogger: true,
            type: 'application'
          }
        );
      }
    });

    it('should return Error data even when no data is obtained in the error', async () => {
      expect.assertions(4);
      const driver = new Proteo4Driver();
      delete koHttpResponse.data;
      const spyDownloadFile = jest.spyOn(driver, 'downloadFile');
      const spyHttp = jest.spyOn(driver, 'http');
      spyHttp.mockRejectedValue(koHttpResponse);
      spyHttp.mockResolvedValueOnce(okHttpResponse);
      try {
        await driver.downloadFile(request);
      } catch (error) {
        expect(spyDownloadFile).toHaveBeenCalled();
        expect(spyHttp).toHaveBeenCalled();
        expect(LoggerUtils.prototype.error).toHaveBeenCalledWith('Internal Server Error', {
          remoteLogger: true,
          type: 'application'
        });
        expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith("[downloadFile] unexpected error code: ''", {
          remoteLogger: true,
          type: 'application'
        });
      }
    });

    it('should retry getting data after downloadFile fails with downloadLinkNotProvisioned exception', async () => {
      // TODO: follow step by step until timeout is reached in order to skip it
      expect.assertions(3);
      (koHttpResponse.data as any).messages[0].alias = 'downloadLinkNotProvisioned';
      const driver = new Proteo4Driver();
      httpMock.mockImplementationOnce(() => Promise.resolve(okHttpResponse));
      httpMock.mockImplementationOnce(() => Promise.reject(koHttpResponse));
      httpMock.mockImplementationOnce(() => Promise.resolve(okHttpResponse));
      const response = await driver.downloadFile(request);
      expect(response).toBe(okHttpResponse);
      expect(httpMock).toHaveBeenCalledTimes(3);
      expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith('[downloadFile] downloadLinkNotProvisioned', {
        remoteLogger: true,
        type: 'application'
      });
    });

    it('should set fileName to null when content-disposition header is null', async () => {
      expect.assertions(2);
      const driver = new Proteo4Driver();

      const responseWithoutContentDisposition = {
        status: 200,
        statusText: '',
        headers: {},
        redirected: false,
        url: '',
        data: {
          downloadId: '3243244',
          downloadLink: 'example/3243244'
        }
      };

      const spyHttp = jest.spyOn(driver, 'http');
      spyHttp
        .mockResolvedValueOnce(responseWithoutContentDisposition)
        .mockResolvedValueOnce(responseWithoutContentDisposition);
      const response = await driver.downloadFile(request);

      expect(response.data.fileName).toBeNull();
      expect(spyHttp).toHaveBeenCalledWith({
        url: 'example/3243244',
        method: 'GET',
        headers: { 'x-p4-channel': 'digital', Accept: 'application/json', 'Content-Type': 'application/json' }
      });
    });

    it('should wrap primitive response.data into data property', async () => {
      expect.assertions(2);

      const driver = new Proteo4Driver();

      const primitiveResponse = {
        status: 200,
        statusText: '',
        headers: { 'content-disposition': 'attachment; filename="example.pdf"' },
        redirected: false,
        url: '',
        data: 'BASE64DATA'
      };

      jest.spyOn(driver, 'http').mockResolvedValueOnce(okHttpResponse).mockResolvedValueOnce(primitiveResponse);

      const response = await driver.downloadFile(request);

      expect(response.data.fileName).toBe('example.pdf');
      expect(response.data.data).toBe('BASE64DATA');
    });

    it('should return data when downloadFile is called all promises resolved', async () => {
      expect.assertions(2);
      const driver = new Proteo4Driver();
      httpMock.mockImplementation(() => Promise.resolve(okHttpResponse));
      const response = await driver.downloadFile(request);
      expect(response).toBe(okHttpResponse);
      expect(httpMock).toHaveBeenCalledTimes(2);
    });

    it('should return file name when downloadPolling is successful', async () => {
      expect.assertions(2);
      const driver = new Proteo4Driver();
      const spyHttp = jest.spyOn(driver, 'http').mockResolvedValueOnce(okHttpResponse);

      const response = await driver.downloadFile(request);

      expect(response.data.fileName).toBe('example.pdf');
      expect(spyHttp).toHaveBeenNthCalledWith(2, {
        url: 'example/3243244',
        method: 'GET',
        headers: { 'x-p4-channel': 'digital', Accept: 'application/json', 'Content-Type': 'application/json' }
      });
    });
  });

  describe('stored request management', () => {
    describe('repeatRequest', () => {
      it('should delegate repeatRequest method to instance method', async () => {
        expect.assertions(1);
        const driver = new Proteo4Driver();
        driver.repeatRequest();
        expect(repeatRequestMock).toHaveBeenCalled();
      });
    });

    describe('deleteRequest', () => {
      it('should delegate deleteRequest method to instance method', async () => {
        expect.assertions(1);
        const driver = new Proteo4Driver();
        driver.deleteRequest(undefined);
        expect(deleteRequestMock).toHaveBeenCalled();
      });
    });

    describe('getRequest', () => {
      it('should delegate getRequest method to instance method', async () => {
        expect.assertions(1);
        const driver = new Proteo4Driver();
        driver.getRequest(undefined);
        expect(getRequestMock).toHaveBeenCalled();
      });
    });
  });

  describe('translateError', () => {
    let errorsSample: DataManagerResponseErrors;
    let driver: typeof Proteo4Driver;
    let errorsBffResponse: any;
    let hasDriverConfigSpy: any;
    let setupByNameSpy: any;

    beforeEach(() => {
      window.BsTranslateErrorDriver = 'TRANSLATE_ERROR_DRIVER';
      driver = new Proteo4Driver();
      driver.instance.translateAllErrors = false;
      errorsSample = {
        messages: [
          {
            alias: 'Z12345'
          } as DataManagerResponseError
        ]
      };
      errorsBffResponse = {
        data: [
          {
            errorMessage: 'Lo sentimos, algo no ha ido bien.',
            code: 'Z12345',
            errorMessageTitle: '',
            errorMessageDetail: 'Para más información, habla con tu gestor, por favor.',
            errorCode: 'Z12345',
            severity: 'FATAL',
            labelCta: '',
            operationCta: '',
            clickToCall: '0',
            evento: 'false',
            nombreOperativa: 'ZZZ',
            idCanal: 'ZZZ'
          }
        ]
      };
      hasDriverConfigSpy = jest.spyOn(DataManagerDriver.prototype, 'hasDriverConfig');
      hasDriverConfigSpy.mockReturnValue(true);
      setupByNameSpy = jest.spyOn(DataManagerDriver.prototype, 'setupByName');
      setupByNameSpy.mockImplementation(() => {
        return;
      });
      mockClassifyErrors.mockReturnValue([[], []]);
      mockConvertLegacyToP4Errors.mockReturnValue([]);
      mockLegacyGenericErrors = [
        {
          errorMessage: 'Algo no ha ido bien',
          code: 'F00000',
          errorMessageTitle: '¡Vaya! Algo no ha ido bien...',
          errorMessageDetail: 'Lo sentimos, algo no ha ido bien.',
          severity: 'FATAL'
        }
      ];
    });

    it('should run classifyErrors if validation succeeds', async () => {
      expect.assertions(1);
      mockValidateErrorFormat.mockReturnValueOnce(true);
      driver.translateError(errorsSample, undefined as any);
      expect(mockClassifyErrors).toHaveBeenCalledWith(errorsSample);
    });

    it('should not run classifyErrors if validation fails, but run convertLegacyToP4Errors with formatError', async () => {
      expect.assertions(2);
      mockValidateErrorFormat.mockReturnValueOnce(false);
      driver.translateError(errorsSample, undefined as any);
      expect(mockClassifyErrors).not.toHaveBeenCalled();
      expect(mockConvertLegacyToP4Errors).toHaveBeenCalledWith(mockLegacyGenericErrors);
    });

    it('should set all errors to be translated if translateAllErrors is set', async () => {
      expect.assertions(2);
      mockValidateErrorFormat.mockReturnValueOnce(true);
      driver.instance.translateAllErrors = true;
      const errorMessages: DataManagerResponseError[] = [
        { alias: 'mockAlias', title: 'mockTitle', message: 'mockMessage', type: 'ERROR' }
      ];
      errorsSample = { messages: errorMessages };
      driver.translateError(errorsSample, undefined as any);
      expect(mockClassifyErrors).not.toHaveBeenCalled();
      expect(httpMock).toHaveBeenCalledWith(expect.objectContaining({ data: errorMessages }));
    });

    it('should log an error if no driver for error translation is present', async () => {
      expect.assertions(6);
      mockValidateErrorFormat.mockReturnValueOnce(true);
      hasDriverConfigSpy.mockReturnValueOnce(false);
      const firstArray = [{ alias: 'Z12345' }];
      const secondArray = [] as any[];
      mockClassifyErrors.mockReturnValueOnce([firstArray, secondArray]);
      const mockResponse = [{ error: 'mockError' }];
      mockConvertLegacyToP4Errors.mockReturnValueOnce(mockResponse);
      expect(await driver.translateError(errorsSample, undefined as any)).toStrictEqual({ messages: mockResponse });
      expect(mockClassifyErrors).toHaveBeenCalledWith(errorsSample);
      expect(hasDriverConfigSpy).toHaveBeenCalledWith('TRANSLATE_ERROR_DRIVER');
      expect(setupByNameSpy).not.toHaveBeenCalled();
      expect(httpMock).not.toHaveBeenCalled();
      expect(LoggerUtils.prototype.error).toHaveBeenCalledWith(
        '[translateError] No proper error translation config was found.',
        {
          remoteLogger: true,
          type: 'application'
        }
      );
    });

    it('should transform those errors classified as Z', async () => {
      expect.assertions(5);
      mockValidateErrorFormat.mockReturnValueOnce(true);
      const firstArray = [{ alias: 'Z12345' }];
      const secondArray = [] as any[];
      mockClassifyErrors.mockReturnValueOnce([firstArray, secondArray]);
      const mockResponse = [{ error: 'mockError' }];
      mockConvertLegacyToP4Errors.mockReturnValueOnce(mockResponse);
      httpMock.mockImplementationOnce(() => Promise.resolve(errorsBffResponse));
      expect(await driver.translateError(errorsSample, undefined as any)).toStrictEqual({ messages: mockResponse });
      expect(mockClassifyErrors).toHaveBeenCalledWith(errorsSample);
      expect(httpMock).toHaveBeenCalledTimes(1);
      expect(mockSendError).toHaveBeenCalledWith(errorsBffResponse.data);
      expect(mockConvertLegacyToP4Errors).toHaveBeenCalledWith(errorsBffResponse.data);
    });

    it('should handle a wrong response from bff', async () => {
      expect.assertions(6);
      mockValidateErrorFormat.mockReturnValueOnce(true);
      const firstArray = [{ alias: 'Z12345' }];
      const secondArray = [] as any[];
      mockClassifyErrors.mockReturnValueOnce([firstArray, secondArray]);
      httpMock.mockImplementationOnce(() => Promise.resolve({}));
      mockConvertLegacyToP4Errors.mockReturnValueOnce(mockLegacyGenericErrors);
      expect(await driver.translateError(errorsSample, undefined as any)).toStrictEqual({
        messages: mockLegacyGenericErrors
      });
      expect(mockClassifyErrors).toHaveBeenCalledWith(errorsSample);
      expect(hasDriverConfigSpy).toHaveBeenCalledWith('TRANSLATE_ERROR_DRIVER');
      expect(setupByNameSpy).toHaveBeenCalledWith('TRANSLATE_ERROR_DRIVER');
      expect(httpMock).toHaveBeenCalledTimes(1);
      mockLegacyGenericErrors[0].code = 'Z12345';
      expect(mockSendError).toHaveBeenCalledWith(mockLegacyGenericErrors);
    });

    it('should handle a exception from http call', async () => {
      expect.assertions(6);
      mockValidateErrorFormat.mockReturnValueOnce(true);
      const firstArray = [{ alias: 'Z12345' }];
      const secondArray = [] as any[];
      mockClassifyErrors.mockReturnValueOnce([firstArray, secondArray]);
      httpMock.mockImplementationOnce(() => Promise.reject({}));
      mockConvertLegacyToP4Errors.mockReturnValueOnce(mockLegacyGenericErrors);
      expect(await driver.translateError(errorsSample, undefined as any)).toStrictEqual({
        messages: mockLegacyGenericErrors
      });
      expect(mockClassifyErrors).toHaveBeenCalledWith(errorsSample);
      expect(hasDriverConfigSpy).toHaveBeenCalledWith('TRANSLATE_ERROR_DRIVER');
      expect(setupByNameSpy).toHaveBeenCalledWith('TRANSLATE_ERROR_DRIVER');
      expect(httpMock).toHaveBeenCalledTimes(1);
      mockLegacyGenericErrors[0].code = 'Z12345';
      expect(mockSendError).toHaveBeenCalledWith(mockLegacyGenericErrors);
    });

    it('should handle a wrong answer from classifyErrors', async () => {
      expect.assertions(4);
      mockValidateErrorFormat.mockReturnValueOnce(true);
      mockClassifyErrors.mockReturnValueOnce('');
      expect(await driver.translateError(errorsSample, undefined as any)).toStrictEqual({ messages: [] });
      expect(mockClassifyErrors).toHaveBeenCalledWith(errorsSample);
      expect(httpMock).not.toHaveBeenCalled();
      expect(mockSendError).not.toHaveBeenCalled();
    });

    it('should keep default code if no proper alias is found', async () => {
      expect.assertions(3);
      mockValidateErrorFormat.mockReturnValueOnce(true);
      mockClassifyErrors.mockReturnValueOnce([[{ mockField: 'mockField' }], []]);
      expect(await driver.translateError(errorsSample, undefined as any)).toStrictEqual({ messages: [] });
      expect(mockClassifyErrors).toHaveBeenCalledWith(errorsSample);
      expect(httpMock).toHaveBeenCalled();
    });

    it('should handle not having Z errors', async () => {
      expect.assertions(4);
      mockValidateErrorFormat.mockReturnValueOnce(true);
      const firstArray = [] as any[];
      const secondArray = [{ alias: 'mockAlias' }];
      mockClassifyErrors.mockReturnValueOnce([firstArray, secondArray]);
      expect(await driver.translateError(errorsSample, undefined as any)).toStrictEqual({ messages: secondArray });
      expect(mockClassifyErrors).toHaveBeenCalledWith(errorsSample);
      expect(httpMock).not.toHaveBeenCalled();
      expect(mockSendError).not.toHaveBeenCalled();
    });

    it('should not exclude sendError functionality if sendErrorOptions are not set', async () => {
      expect.assertions(5);
      mockValidateErrorFormat.mockReturnValueOnce(true);
      const firstArray = [{ alias: 'Z12345' }];
      const secondArray = [] as any[];
      mockClassifyErrors.mockReturnValueOnce([firstArray, secondArray]);
      const mockResponse = [{ error: 'mockError' }];
      mockConvertLegacyToP4Errors.mockReturnValueOnce(mockResponse);
      httpMock.mockImplementationOnce(() => Promise.resolve(errorsBffResponse));
      expect(await driver.translateError(errorsSample, undefined as any)).toStrictEqual({ messages: mockResponse });
      expect(mockClassifyErrors).toHaveBeenCalledWith(errorsSample);
      expect(httpMock).toHaveBeenCalledTimes(1);
      expect(mockSendError).toHaveBeenCalled();
      expect(mockConvertLegacyToP4Errors).toHaveBeenCalledWith(errorsBffResponse.data);
    });

    it('should exclude sendError functionality if propagate is set to true but alias is excluded', async () => {
      expect.assertions(5);
      mockValidateErrorFormat.mockReturnValueOnce(true);
      const firstArray = [{ alias: 'Z12345' }];
      const secondArray = [] as any[];
      mockClassifyErrors.mockReturnValueOnce([firstArray, secondArray]);
      const mockResponse = [{ error: 'mockError' }];
      mockConvertLegacyToP4Errors.mockReturnValueOnce(mockResponse);
      httpMock.mockImplementationOnce(() => Promise.resolve(errorsBffResponse));
      expect(
        await driver.translateError(errorsSample, undefined as any, { propagate: true, excludedAliases: ['Z12345'] })
      ).toStrictEqual({
        messages: mockResponse
      });
      expect(mockClassifyErrors).toHaveBeenCalledWith(errorsSample);
      expect(httpMock).toHaveBeenCalledTimes(1);
      expect(mockSendError).not.toHaveBeenCalled();
      expect(mockConvertLegacyToP4Errors).toHaveBeenCalledWith(errorsBffResponse.data);
    });

    it('should not exclude sendError functionality if propagate is set to true, alias is provided but not found', async () => {
      expect.assertions(5);
      mockValidateErrorFormat.mockReturnValueOnce(true);
      const firstArray = [{ alias: 'Z12345' }];
      const secondArray = [] as any[];
      mockClassifyErrors.mockReturnValueOnce([firstArray, secondArray]);
      const mockResponse = [{ error: 'mockError' }];
      mockConvertLegacyToP4Errors.mockReturnValueOnce(mockResponse);
      httpMock.mockImplementationOnce(() => Promise.resolve(errorsBffResponse));
      expect(
        await driver.translateError(errorsSample, undefined as any, { propagate: true, excludedAliases: ['Z123456'] })
      ).toStrictEqual({
        messages: mockResponse
      });
      expect(mockClassifyErrors).toHaveBeenCalledWith(errorsSample);
      expect(httpMock).toHaveBeenCalledTimes(1);
      expect(mockSendError).toHaveBeenCalled();
      expect(mockConvertLegacyToP4Errors).toHaveBeenCalledWith(errorsBffResponse.data);
    });

    it('should exclude sendError functionality if propagate is set to false', async () => {
      expect.assertions(5);
      mockValidateErrorFormat.mockReturnValueOnce(true);
      const firstArray = [{ alias: 'Z12345' }];
      const secondArray = [] as any[];
      mockClassifyErrors.mockReturnValueOnce([firstArray, secondArray]);
      const mockResponse = [{ error: 'mockError' }];
      mockConvertLegacyToP4Errors.mockReturnValueOnce(mockResponse);
      httpMock.mockImplementationOnce(() => Promise.resolve(errorsBffResponse));
      expect(await driver.translateError(errorsSample, undefined as any, { propagate: false })).toStrictEqual({
        messages: mockResponse
      });
      expect(mockClassifyErrors).toHaveBeenCalledWith(errorsSample);
      expect(httpMock).toHaveBeenCalledTimes(1);
      expect(mockSendError).not.toHaveBeenCalled();
      expect(mockConvertLegacyToP4Errors).toHaveBeenCalledWith(errorsBffResponse.data);
    });

    it('should not exclude sendError functionality if propagate is set to false but alias is excluded', async () => {
      expect.assertions(5);
      mockValidateErrorFormat.mockReturnValueOnce(true);
      const firstArray = [{ alias: 'Z12345' }];
      const secondArray = [] as any[];
      mockClassifyErrors.mockReturnValueOnce([firstArray, secondArray]);
      const mockResponse = [{ error: 'mockError' }];
      mockConvertLegacyToP4Errors.mockReturnValueOnce(mockResponse);
      httpMock.mockImplementationOnce(() => Promise.resolve(errorsBffResponse));
      expect(
        await driver.translateError(errorsSample, undefined as any, { propagate: false, excludedAliases: ['Z12345'] })
      ).toStrictEqual({
        messages: mockResponse
      });
      expect(mockClassifyErrors).toHaveBeenCalledWith(errorsSample);
      expect(httpMock).toHaveBeenCalledTimes(1);
      expect(mockSendError).toHaveBeenCalled();
      expect(mockConvertLegacyToP4Errors).toHaveBeenCalledWith(errorsBffResponse.data);
    });
  });
});
