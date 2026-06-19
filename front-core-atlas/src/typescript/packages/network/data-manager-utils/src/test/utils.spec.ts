import { describe, expect, it } from '@jest/globals';
import { classifyErrors, combineURLs, convertLegacyToP4Errors, getParams, validateErrorFormat } from '../utils.js';
import { type DataManagerResponseError, type DataManagerResponseErrors, EnumEnvironments } from '@proteo/types';
import type { ErrorManagementPayload } from '@proteo/error-management-utils';

describe('proteo4-driver', () => {
  describe('combineURLs', () => {
    it('should combine urls into a valid format', () => {
      expect.assertions(3);

      expect(combineURLs('http://www.foo.bar/', '/api')).toBe('http://www.foo.bar/api');
      expect(combineURLs('http://www.foo.bar', 'api')).toBe('http://www.foo.bar/api');
      expect(combineURLs('http://www.foo.bar', '')).toBe('http://www.foo.bar');
    });
  });

  describe('getParams', () => {
    it('should concat object parameters into a URL search params', () => {
      expect.assertions(1);
      expect(getParams({ param1: 'value', param2: 'value' }).toString()).toBe('param1=value&param2=value');
    });

    it('should concat object parameters into a URL search params in old browsers', () => {
      expect.assertions(1);
      Object.defineProperty(window, 'URLSearchParams', {
        writable: true,
        value: undefined
      });
      expect(getParams({ param1: 'value', param2: 'value' })).toBe('param1=value&param2=value');
    });
  });

  describe('validateErrorFormat', () => {
    let dataManagerResponseErrors: DataManagerResponseErrors;

    it('should return false if no error object is provided', () => {
      expect.assertions(1);
      expect(validateErrorFormat(undefined as unknown as DataManagerResponseErrors)).toBeFalsy();
    });

    it('should return false if no messages key is present', () => {
      expect.assertions(1);
      dataManagerResponseErrors = { someRandomKey: 'someRandomContent' } as any;
      expect(validateErrorFormat(dataManagerResponseErrors)).toBeFalsy();
    });

    it('should return false if messages key is present but empty', () => {
      expect.assertions(1);
      dataManagerResponseErrors.messages = [];
      expect(validateErrorFormat(dataManagerResponseErrors)).toBeFalsy();
    });

    it('should return false if messages are present but none of them have proper structure', () => {
      expect.assertions(1);
      dataManagerResponseErrors.messages.push({ alias: 'incompleteErrorAlias' } as DataManagerResponseError);
      dataManagerResponseErrors.messages.push({ message: 'incompleteErrorMessage' } as DataManagerResponseError);
      expect(validateErrorFormat(dataManagerResponseErrors)).toBeFalsy();
    });

    it('should return true if messages are present and any of them have proper structure', () => {
      expect.assertions(1);
      dataManagerResponseErrors.messages.push({
        alias: 'properErrorAlias',
        message: 'properErrorMessage',
        type: 'ERROR'
      });
      expect(validateErrorFormat(dataManagerResponseErrors)).toBeTruthy();
    });
  });

  describe('classifyErrors', () => {
    let dataManagerResponseErrors: DataManagerResponseErrors;
    let expectedResponse: Array<DataManagerResponseError[]>;

    it('should return two arrays even if no error object is provided', () => {
      expect.assertions(1);
      expectedResponse = [new Array<DataManagerResponseError>(), new Array<DataManagerResponseError>()];
      expect(classifyErrors(undefined as unknown as DataManagerResponseErrors)).toStrictEqual(expectedResponse);
    });

    it('should return two arrays even if no messages key is present', () => {
      expect.assertions(1);
      dataManagerResponseErrors = { someRandomKey: 'someRandomContent' } as any;
      expect(classifyErrors(dataManagerResponseErrors)).toStrictEqual(expectedResponse);
    });

    it('should return two arrays even if messages key is present but empty', () => {
      expect.assertions(1);
      dataManagerResponseErrors.messages = [];
      expect(classifyErrors(dataManagerResponseErrors)).toStrictEqual(expectedResponse);
    });

    it('should return include not Z errors in second array', () => {
      expect.assertions(1);
      const newNotZError = { alias: 'mockAlias' };
      dataManagerResponseErrors.messages.push(newNotZError as DataManagerResponseError);
      expectedResponse[1].push(newNotZError as DataManagerResponseError);
      expect(classifyErrors(dataManagerResponseErrors)).toStrictEqual(expectedResponse);
    });

    it('should return include Z errors in first array', () => {
      expect.assertions(1);
      const newZError = { alias: 'Z12345' };
      dataManagerResponseErrors.messages.push(newZError as DataManagerResponseError);
      expectedResponse[0].push(newZError as DataManagerResponseError);
      expect(classifyErrors(dataManagerResponseErrors)).toStrictEqual(expectedResponse);
    });

    it('should return include Z errors in first array', () => {
      expect.assertions(1);
      const newZError = { alias: 'Z123' };
      dataManagerResponseErrors.messages.push(newZError as DataManagerResponseError);
      expectedResponse[0].push(newZError as DataManagerResponseError);
      expect(classifyErrors(dataManagerResponseErrors)).toStrictEqual(expectedResponse);
    });

    it('should return include Z errors in first array', () => {
      expect.assertions(1);
      const newZError = { alias: 'Z1234567' };
      dataManagerResponseErrors.messages.push(newZError as DataManagerResponseError);
      expectedResponse[0].push(newZError as DataManagerResponseError);
      expect(classifyErrors(dataManagerResponseErrors)).toStrictEqual(expectedResponse);
    });
  });

  describe('convertLegacyToP4Errors', () => {
    let errorEntryArray: (ErrorManagementPayload | DataManagerResponseError)[];
    let expectedResponse: Array<DataManagerResponseError>;

    it('should return an empty array even if no error array is provided', () => {
      expect.assertions(1);
      expectedResponse = [];
      expect(convertLegacyToP4Errors(undefined as unknown as DataManagerResponseError[])).toStrictEqual(
        expectedResponse
      );
    });

    it('should return an empty array if an empty array is provided as well', () => {
      expect.assertions(1);
      errorEntryArray = [];
      expect(convertLegacyToP4Errors(errorEntryArray)).toStrictEqual(expectedResponse);
    });

    it('should directly push DataManagerResponseError formatted errors into response', () => {
      expect.assertions(1);
      const dataManagerResponseError: DataManagerResponseError = {
        alias: 'dataManagerResponseErrorAlias',
        message: 'dataManagerResponseErrorMessage',
        type: 'ERROR'
      };
      errorEntryArray.push(dataManagerResponseError);
      expectedResponse.push(dataManagerResponseError);
      expect(convertLegacyToP4Errors(errorEntryArray)).toStrictEqual(expectedResponse);
    });

    it('should properly transform ErrorManagementPayload errors before pushing them into response', () => {
      expect.assertions(1);
      const errorManagementPayload: ErrorManagementPayload = {
        errorMessage: 'mockErrorMessage',
        code: 'mockCode',
        errorMessageTitle: 'mockErrorMessageTitle',
        errorMessageDetail: 'mockErrorMessageDetail',
        errorCode: 'mockErrorCode',
        severity: 'ERROR',
        labelCta: 'mockLabelCta',
        operationCta: 'mockOperationCta',
        clickToCall: 'mockClickToCall',
        nombreOperativa: 'mockNombreOperativa',
        idCanal: EnumEnvironments.INT
      };
      const transformedError: DataManagerResponseError = {
        alias: 'mockErrorMessage.mockCode',
        message: 'mockErrorMessageDetail',
        type: 'ERROR',
        title: 'mockErrorMessageTitle',
        params: [
          {
            name: 'severity',
            message: 'ERROR'
          },
          {
            name: 'labelCta',
            message: 'mockLabelCta'
          },
          {
            name: 'operationCta',
            message: 'mockOperationCta'
          },
          {
            name: 'clickToCall',
            message: 'mockClickToCall'
          },
          {
            name: 'nombreOperativa',
            message: 'mockNombreOperativa'
          },
          {
            name: 'idCanal',
            message: 'INT'
          },
          {
            name: 'errorCode',
            message: 'mockErrorCode'
          }
        ]
      };
      errorEntryArray.push(errorManagementPayload);
      expectedResponse.push(transformedError);
      expect(convertLegacyToP4Errors(errorEntryArray)).toStrictEqual(expectedResponse);
    });

    it('should not include params key if empty when formatting', () => {
      expect.assertions(1);
      const errorManagementPayload: ErrorManagementPayload = {
        errorMessage: 'mockErrorMessage2',
        errorMessageTitle: 'mockErrorMessageTitle2',
        errorMessageDetail: 'mockErrorMessageDetail2'
      } as unknown as ErrorManagementPayload;
      const transformedError: DataManagerResponseError = {
        alias: 'mockErrorMessage2',
        message: 'mockErrorMessageDetail2',
        type: 'ERROR',
        title: 'mockErrorMessageTitle2'
      };
      errorEntryArray.push(errorManagementPayload);
      expectedResponse.push(transformedError);
      expect(convertLegacyToP4Errors(errorEntryArray)).toStrictEqual(expectedResponse);
    });
  });
});
