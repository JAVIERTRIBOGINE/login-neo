import { beforeEach, afterEach, afterAll, describe, expect, it, jest } from '@jest/globals';
import type {
  AuthConfig,
  AuthenticateRequest,
  AuthorizeRequest,
  DataManagerResponse,
  TokensRequest,
  UserInfoEventResponse,
  UserInfoResponse
} from '@proteo/types';
import crypto from 'crypto';
import { TextEncoder } from 'util';
import { urls } from '../authentication-configuration.js';
import { StorageManager } from '@proteo/storage-utils';
import { LoggerUtils } from '@proteo/logger-utils';
import { I18n } from '@proteo/i18n-utils';
import { EventManager } from '@proteo/event-bus';

let authConfig: AuthConfig;

Object.defineProperty(global.self, 'crypto', {
  value: {
    getRandomValues: (arr: unknown[]) => crypto.randomBytes(arr.length),
    subtle: {
      digest: jest.fn<() => Promise<ArrayBuffer>>().mockResolvedValue(new ArrayBuffer(32))
    }
  }
});

Object.defineProperty(global.self, 'TextEncoder', {
  value: TextEncoder
});

const mockClearTokens = jest.fn();
const mockGetDriver = jest.fn();
const mockHttp = jest.fn();
const mockHttpPost = jest.fn();
const mockHttpGet = jest.fn();
mockGetDriver.mockImplementation(() => ({
  http: mockHttp,
  post: mockHttpPost,
  get: mockHttpGet
}));

const mockHasDriver = jest.fn();
mockHasDriver.mockReturnValue(true);
const mockStoredTokens = jest.fn();
jest.unstable_mockModule('@proteo/data-manager', () => ({
  clearTokens: mockClearTokens,
  getDriver: mockGetDriver,
  hasDriver: mockHasDriver,
  storedTokens: mockStoredTokens
}));

const mockIsNative = jest.fn();
mockIsNative.mockReturnValue(false);
jest.unstable_mockModule('@proteo/platform-utils', () => ({
  isNative: mockIsNative
}));

const mockParseJwt = jest.fn();
jest.unstable_mockModule('@proteo/string-utils', () => ({
  parseJwt: mockParseJwt,
  base64UrlEncode: jest.fn().mockReturnValue('mockBase64Encoded'),
  sha256: jest.fn()
}));

const mockStoreUtilsSet = jest.fn();
const mockStoreUtilsGet = jest.fn();
const mockStoreUtilsRemove = jest.fn();
const mockStoreManagerGetInstance = jest.fn().mockImplementation(() => ({
  set: mockStoreUtilsSet,
  get: mockStoreUtilsGet,
  remove: mockStoreUtilsRemove
})) as jest.MockedFunction<typeof StorageManager.getInstance>;
StorageManager.getInstance = mockStoreManagerGetInstance;

const mockI18nGetInstance = jest.fn().mockImplementation(() => ({
  isoLanguage: 'ca_ES'
})) as jest.MockedFunction<typeof I18n.getInstance>;
I18n.getInstance = mockI18nGetInstance;

const mockWarn = jest.fn();
const mockError = jest.fn();

describe('authorization-utils', () => {
  let request: AuthorizeRequest;
  let authenticate: any;
  let authorize: any;
  let getTokens: any;
  let initialize: any;
  let isAuthInitialized: any;
  let AuthorizationUtils: any;
  let getUserInfo: any;
  let endSession: any;
  let revoke: any;
  let endSessionEmployees: any;
  let revokeEmployees: any;

  beforeEach(async () => {
    authConfig = {
      DATA_MANAGER: 'AUTH',
      AUTH_TYPE: 'TEMPORAL_IDENTITIES',
      CLIENT_ID: 'CLIENT_ID',
      REDIRECT_URI: 'REDIRECT_URL',
      SCOPES: ['SCOPE']
    };
    await import('@proteo/data-manager');
    await import('@proteo/platform-utils');
    ({
      AuthorizationUtils,
      authenticate,
      authorize,
      getTokens,
      initialize,
      isAuthInitialized,
      endSession,
      revoke,
      getUserInfo,
      endSessionEmployees,
      revokeEmployees
    } = await import('../authorization-utils.js'));
    request = {
      clientId: 'CLIENT_ID',
      redirectUri: 'REDIRECT_URI'
    };
    LoggerUtils.prototype.warn = mockWarn;
    LoggerUtils.prototype.error = mockError;
  });

  afterEach(() => {
    window.BsAuthorizationConfig = undefined as any;
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize properly if conf is properly set', async () => {
      expect.assertions(2);
      expect(window.BsAuthorizationConfig).toBeUndefined();
      initialize(authConfig);
      expect(window.BsAuthorizationConfig).toMatchObject({
        clientID: 'CLIENT_ID',
        dataManager: 'AUTH',
        redirectUri: 'REDIRECT_URL',
        scopes: ['SCOPE']
      });
    });

    it('should recover urls for TEMPORAL_IDENTITIES properly', () => {
      expect.assertions(2);
      expect(window.BsAuthorizationConfig).toBeUndefined();
      initialize(authConfig);
      expect(window.BsAuthorizationConfig).toMatchObject({
        type: 'TEMPORAL_IDENTITIES',
        url: urls.TEMPORAL_IDENTITIES
      });
    });

    it('should recover urls for CUSTOMER properly', () => {
      expect.assertions(2);
      authConfig.AUTH_TYPE = 'CUSTOMER';
      expect(window.BsAuthorizationConfig).toBeUndefined();
      initialize(authConfig);
      expect(window.BsAuthorizationConfig).toMatchObject({
        type: 'CUSTOMER',
        url: urls.CUSTOMER
      });
    });

    it('should recover urls for EMPLOYEES properly', () => {
      expect.assertions(2);
      authConfig.AUTH_TYPE = 'EMPLOYEES';
      expect(window.BsAuthorizationConfig).toBeUndefined();
      initialize(authConfig);
      expect(window.BsAuthorizationConfig).toMatchObject({
        type: 'EMPLOYEES',
        url: urls.EMPLOYEES
      });
    });

    it('should show a warning if conf sets a wrong type and default to TEMPORAL_IDENTITIES', async () => {
      expect.assertions(3);
      authConfig.AUTH_TYPE = 'mockWrongType' as any;
      expect(window.BsAuthorizationConfig).toBeUndefined();
      initialize(authConfig);
      expect(mockWarn).toHaveBeenCalledWith('[Authorization] No proper AUTH_TYPE found, TEMPORAL_IDENTITIES set by default');
      expect(window.BsAuthorizationConfig).toMatchObject({
        type: 'TEMPORAL_IDENTITIES',
        url: urls.TEMPORAL_IDENTITIES
      });
    });

    it('should default to TEMPORAL_IDENTITIES and not show warning if AUTH_TYPE is not found', async () => {
      expect.assertions(3);
      authConfig.AUTH_TYPE = undefined as any;
      expect(window.BsAuthorizationConfig).toBeUndefined();
      initialize(authConfig);
      expect(mockWarn).not.toHaveBeenCalled();
      expect(window.BsAuthorizationConfig).toMatchObject({
        type: 'TEMPORAL_IDENTITIES',
        url: urls.TEMPORAL_IDENTITIES
      });
    });
  });

  describe('authenticate', () => {
    let request: AuthenticateRequest;

    beforeEach(() => {
      request = {
        userId: 'user',
        password: 'pass'
      };
    });

    it('should throw error when no driver available', async () => {
      expect.assertions(1);
      initialize(authConfig);
      mockGetDriver.mockReturnValueOnce(undefined);
      await expect(authenticate(request)).rejects.toThrowError('[Authentication] Missing Driver');
    });

    it('should use TEMPORAL_IDENTITIES by default', async () => {
      expect.assertions(1);
      initialize(authConfig);
      await authenticate(request);
      const expectedUrl = urls.TEMPORAL_IDENTITIES.authenticate;
      const expectedHeaders = { Authorization: expect.stringContaining('Basic') };
      expect(mockHttpPost).toBeCalledWith(expectedUrl, undefined, expectedHeaders);
    });

    it('should be able to configure for EMPLOYEES', async () => {
      expect.assertions(1);
      authConfig.AUTH_TYPE = 'EMPLOYEES';
      initialize(authConfig);
      await authenticate(request);
      const expectedUrl = urls.EMPLOYEES.authenticate;
      const expectedHeaders = { Authorization: expect.stringContaining('Basic') };
      expect(mockHttpPost).toBeCalledWith(expectedUrl, undefined, expectedHeaders);
    });

    it('should be able to configure for CUSTOMER', async () => {
      expect.assertions(1);
      authConfig.AUTH_TYPE = 'CUSTOMER';
      initialize(authConfig);
      await authenticate(request);
      const expectedUrl = urls.CUSTOMER.authenticate;
      const expectedHeaders = { Authorization: expect.stringContaining('Basic') };
      expect(mockHttpPost).toBeCalledWith(expectedUrl, undefined, expectedHeaders);
    });
  });

  describe('authorize', () => {
    let customRequest: AuthorizeRequest;
    let expectedUrl: string;
    let expectedParams: any;

    beforeEach(() => {
      customRequest = {
        ...request,
        state: 'STATE',
        codeChallengeMethod: 'CODE-CHALLENGE-METHOD',
        codeChallenge: 'CODE-CHALLENGE'
      };
      expectedUrl = urls.TEMPORAL_IDENTITIES.authorize;
      expectedParams = {
        client_id: customRequest.clientId,
        redirect_uri: customRequest.redirectUri,
        response_type: 'code',
        state: customRequest.state,
        code_challenge_method: customRequest.codeChallengeMethod,
        code_challenge: customRequest.codeChallenge
      };
    });

    it('should return true when checking if auth is initialized', async () => {
      expect.assertions(1);
      initialize(authConfig);
      expect(isAuthInitialized()).toBe(true);
    });

    it('should throw error when no driver available', async () => {
      expect.assertions(1);
      initialize(authConfig);
      mockGetDriver.mockReturnValueOnce(undefined);
      await expect(authorize(customRequest)).rejects.toThrowError('Missing Driver');
    });

    it('should work fine just with clientId and redirectUri', async () => {
      expect.assertions(2);
      initialize(authConfig);
      await authorize(customRequest);
      expect(mockStoreUtilsSet).toHaveBeenCalledWith('STATE', 'STATE');
      expect(mockHttpGet).toBeCalledWith(expectedUrl, {}, expectedParams);
    });

    it('should work fine also for employees', async () => {
      expect.assertions(2);
      authConfig.AUTH_TYPE = 'EMPLOYEES';
      expectedUrl = urls.EMPLOYEES.authorize;
      initialize(authConfig);
      await authorize(customRequest);
      expect(mockStoreUtilsSet).toHaveBeenCalledWith('STATE', 'STATE');
      expect(mockHttpGet).toBeCalledWith(expectedUrl, {}, expectedParams);
    });

    it('should work fine also for customers', async () => {
      expect.assertions(2);
      authConfig.AUTH_TYPE = 'CUSTOMER';
      expectedUrl = urls.CUSTOMER.authorize;
      initialize(authConfig);
      await authorize(customRequest);
      expect(mockStoreUtilsSet).toHaveBeenCalledWith('STATE', 'STATE');
      expect(mockHttpGet).toBeCalledWith(expectedUrl, {}, expectedParams);
    });

    it('should generate a new state if none specified', async () => {
      expect.assertions(2);
      delete customRequest.state;
      expectedParams.state = expect.any(String);
      initialize(authConfig);
      await authorize(customRequest);
      expect(mockStoreUtilsSet).toHaveBeenCalledWith('STATE', expect.any(String));
      expect(mockHttpGet).toBeCalledWith(expectedUrl, {}, expectedParams);
    });

    it('should use S256 as code challenge method if none specified', async () => {
      expect.assertions(2);
      delete customRequest.codeChallengeMethod;
      expectedParams.code_challenge_method = 'S256';
      initialize(authConfig);
      await authorize(customRequest);
      expect(mockStoreUtilsSet).toHaveBeenCalledWith('STATE', 'STATE');
      expect(mockHttpGet).toBeCalledWith(expectedUrl, {}, expectedParams);
    });

    it('should generate a new code challenge if none specified', async () => {
      expect.assertions(3);
      delete customRequest.codeChallenge;
      expectedParams.code_challenge = expect.any(String);
      initialize(authConfig);
      await authorize(customRequest);
      expect(mockStoreUtilsSet).toHaveBeenNthCalledWith(1, 'STATE', 'STATE');
      expect(mockStoreUtilsSet).toHaveBeenNthCalledWith(2, 'CODE_VERIFIER', expect.any(String));
      expect(mockHttpGet).toBeCalledWith(expectedUrl, {}, expectedParams);
    });

    it('should include scope in request if specified as param', async () => {
      expect.assertions(2);
      customRequest.scope = 'SCOPE';
      expectedParams.scope = 'SCOPE';
      initialize(authConfig);
      await authorize(customRequest);
      expect(mockStoreUtilsSet).toHaveBeenCalledWith('STATE', 'STATE');
      expect(mockHttpGet).toBeCalledWith(expectedUrl, {}, expectedParams);
    });

    it('should include csrf in request if specified as param', async () => {
      expect.assertions(2);
      customRequest.csrf = 'CSRF';
      expectedParams.csrf = 'CSRF';
      initialize(authConfig);
      await authorize(customRequest);
      expect(mockStoreUtilsSet).toHaveBeenCalledWith('STATE', 'STATE');
      expect(mockHttpGet).toBeCalledWith(expectedUrl, {}, expectedParams);
    });

    it('should make a post request if request.method is set to post', async () => {
      expect.assertions(2);
      initialize(authConfig);
      await authorize({
        ...customRequest,
        method: 'post'
      });
      const expectedHeaders = {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      };
      expect(mockStoreUtilsSet).toHaveBeenCalledWith('STATE', 'STATE');
      expect(mockHttpPost).toBeCalledWith(expectedUrl, expectedParams, expectedHeaders);
    });
  });

  describe('getTokens', () => {
    const { location } = window;
    const defaultExpectedBody = {
      grant_type: 'authorization_code',
      redirect_uri: 'REDIRECT_URI',
      code_verifier: expect.any(String),
      code: 'CODE'
    };
    let customRequest: TokensRequest;
    let expectedUrl: string;
    let expectedHeaders: any;

    afterAll(() => {
      Object.defineProperty(window, 'location', {
        value: location
      });
    });

    beforeEach(() => {
      customRequest = {
        ...request,
        code: 'CODE',
        state: 'STATE'
      };
      expectedUrl = urls.TEMPORAL_IDENTITIES.token;
      expectedHeaders = {
        'Content-Type': 'application/x-www-form-urlencoded'
      };
      mockStoreUtilsGet.mockReturnValue('STATE');
    });

    it("should throw error if can't get code", async () => {
      initialize(authConfig);
      await expect(getTokens(request)).rejects.toThrowError('Missing param code');
    });

    it("should throw error if can't get state", async () => {
      initialize(authConfig);
      delete customRequest.state;
      await expect(getTokens(customRequest)).rejects.toThrowError('Missing param state');
    });

    it("should throw error if state don't match", async () => {
      mockStoreUtilsGet.mockReturnValueOnce('mockWrongState');
      initialize(authConfig);
      await expect(getTokens(customRequest)).rejects.toThrowError('Invalid param state');
    });

    it('should throw error when no driver available', async () => {
      mockGetDriver.mockReturnValueOnce(undefined);
      initialize(authConfig);
      await expect(getTokens(customRequest)).rejects.toThrowError('Missing Driver');
    });

    it('should make a post call with correct params after an authorize call', async () => {
      initialize(authConfig);
      await getTokens(customRequest);
      const expectedParams = {
        ...defaultExpectedBody,
        clientId: request.clientId
      };
      expect(mockStoreUtilsRemove).toHaveBeenCalledTimes(2);
      expect(mockHttpPost).toBeCalledWith(expectedUrl, expectedParams, expectedHeaders);
    });

    it('should set client_id params for employees', async () => {
      authConfig.AUTH_TYPE = 'EMPLOYEES';
      initialize(authConfig);
      await getTokens(customRequest);
      expectedUrl = urls.EMPLOYEES.token;
      const expectedParams = {
        ...defaultExpectedBody,
        client_id: request.clientId
      };
      expect(mockHttpPost).toBeCalledWith(expectedUrl, expectedParams, expectedHeaders);
    });

    it('should take code and state params from url', async () => {
      mockStoreUtilsGet.mockReturnValueOnce('URL_STATE');
      Object.defineProperty(window, 'location', {
        value: {
          search: '?code=URL_CODE&state=URL_STATE'
        }
      });
      initialize(authConfig);
      await getTokens(request);
      const expectedParams = {
        ...defaultExpectedBody,
        code: 'URL_CODE',
        clientId: request.clientId
      };
      expect(mockHttpPost).toBeCalledWith(expectedUrl, expectedParams, expectedHeaders);
    });

    it('should take code and state params from history', async () => {
      mockStoreUtilsGet.mockReturnValueOnce('HISTORY_STATE');
      window.history.pushState(
        {
          data: {
            params: {
              state: 'HISTORY_STATE',
              code: 'HISTORY_CODE'
            }
          }
        },
        '',
        ''
      );
      initialize(authConfig);
      await getTokens(request);
      const expectedParams = {
        ...defaultExpectedBody,
        code: 'HISTORY_CODE',
        clientId: request.clientId
      };
      expect(mockHttpPost).toBeCalledWith(expectedUrl, expectedParams, expectedHeaders);
    });
  });

  describe('endSession', () => {
    let getSuccess: boolean;

    beforeEach(() => {
      mockStoredTokens.mockReturnValue({ OAUTH: 'OAUTH', OIDC: 'OIDC' });
      authConfig.AUTH_TYPE = 'EMPLOYEES';
      getSuccess = true;
      mockHttpGet.mockImplementation((): Promise<DataManagerResponse<any>> => {
        if (getSuccess) {
          return Promise.resolve({ data: {} } as DataManagerResponse<any>);
        }
        return Promise.reject('mockError');
      });
    });

    it('should log an error if no driver is found under given name', async () => {
      expect.assertions(3);
      mockHasDriver.mockReturnValueOnce(false);
      initialize(authConfig);
      const endSessionMock: Promise<void> = endSession('CLIENT_ID', 'DRIVER');

      await expect(endSessionMock).rejects.toBe('[Authorization Util] [endSession] Missing driver');
      expect(mockGetDriver).not.toHaveBeenCalled();
      expect(mockError).toHaveBeenCalledWith('[Authorization Util] [endSession] Missing driver');
    });

    it('should log an error if unable to retrieve the driver', async () => {
      expect.assertions(4);
      mockGetDriver.mockReturnValueOnce(undefined);
      initialize(authConfig);
      const endSessionMock: Promise<void> = endSession('CLIENT_ID', 'DRIVER');

      await expect(endSessionMock).rejects.toBe('[Authorization Util] [endSession] Missing driver');
      expect(mockGetDriver).toHaveBeenCalledWith('DRIVER');
      expect(mockHttpPost).not.toHaveBeenCalled();
      expect(mockError).toHaveBeenCalledWith('[Authorization Util] [endSession] Missing driver');
    });

    it('should run successfully if everything properly set', async () => {
      expect.assertions(4);
      initialize(authConfig);
      const endSessionMock: Promise<void> = endSession('CLIENT_ID', 'DRIVER');
      await expect(endSessionMock).resolves.toBeUndefined();

      expect(mockGetDriver).toHaveBeenCalledWith('DRIVER');
      expect(mockHttpGet).toHaveBeenCalledWith(urls.EMPLOYEES.endSession + '?id_token_hint=OIDC&client_id=CLIENT_ID');
      await Promise.all([mockHttpGet.mock.results[0].value]);
      expect(mockError).not.toHaveBeenCalled();
    });

    it('should log an error if service fails', async () => {
      expect.assertions(5);
      getSuccess = false;
      initialize(authConfig);
      const endSessionMock: Promise<void> = endSession('CLIENT_ID', 'DRIVER');

      await expect(endSessionMock).rejects.toBe('mockError');
      expect(mockGetDriver).toHaveBeenCalledWith('DRIVER');
      expect(mockHttpGet).toHaveBeenCalledWith(urls.EMPLOYEES.endSession + '?id_token_hint=OIDC&client_id=CLIENT_ID');
      await expect(mockHttpGet).rejects.toBe('mockError');
      expect(mockError).toHaveBeenCalledWith('[Authorization Util] [endSession] Error ending session: mockError');
    });

    it('should log a warning if tried with temporal identities auth type', async () => {
      expect.assertions(3);
      authConfig.AUTH_TYPE = 'TEMPORAL_IDENTITIES';
      initialize(authConfig);
      const endSessionMock: Promise<void> = endSession('CLIENT_ID', 'DRIVER');

      await expect(endSessionMock).rejects.toBe('[Authorization Util] [endSession] Method not available for this clientId');
      expect(mockHasDriver).not.toHaveBeenCalled();
      expect(mockWarn).toHaveBeenCalledWith('[Authorization Util] [endSession] Method not available for this clientId');
    });

    it('should log a warning if tried with customer auth type', async () => {
      expect.assertions(3);
      authConfig.AUTH_TYPE = 'CUSTOMER';
      initialize(authConfig);
      const endSessionMock: Promise<void> = endSession('CLIENT_ID', 'DRIVER');

      await expect(endSessionMock).rejects.toBe('[Authorization Util] [endSession] Method not available for this clientId');
      expect(mockHasDriver).not.toHaveBeenCalled();
      expect(mockWarn).toHaveBeenCalledWith('[Authorization Util] [endSession] Method not available for this clientId');
    });

    it('should log a warning when calling endSessionEmployees, then call endSession', async () => {
      expect.assertions(2);
      initialize(authConfig);
      const endSessionMock: Promise<void> = endSessionEmployees('CLIENT_ID', 'DRIVER');
      await expect(endSessionMock).resolves.toBeUndefined();
      expect(mockWarn).toHaveBeenCalledWith('[Authorization Util] [endSessionEmployees] deprecated method, call endSession instead');
    });
  });

  describe('revoke', () => {
    let postSuccess: boolean;
    let expectedRequestTokens: any;
    let expectedRequestHeaders: any;
    let expectedRequestUrl: string;

    beforeEach(() => {
      mockStoredTokens.mockReturnValue({ OAUTH: 'OAUTH', OIDC: 'OIDC' });
      authConfig.AUTH_TYPE = 'EMPLOYEES';
      postSuccess = true;
      mockHttpPost.mockImplementation((): Promise<DataManagerResponse<any>> => {
        if (postSuccess) {
          return Promise.resolve({ data: {} } as DataManagerResponse<any>);
        }
        return Promise.reject('mockError');
      });
      expectedRequestUrl = urls.EMPLOYEES.revoke!;
      expectedRequestTokens = {
        token: 'OAUTH'
      };
      expectedRequestHeaders = {
        Accept: 'application/json',
        Authorization: expect.any(String),
        'accept-language': 'ca_ES',
        'content-language': 'ca_ES',
        'content-type': 'application/x-www-form-urlencoded'
      };
    });

    it('should log an error if no driver is found under given name', async () => {
      expect.assertions(3);
      mockHasDriver.mockReturnValueOnce(false);
      initialize(authConfig);
      const revokeMock = revoke('CLIENT_ID', 'DRIVER');

      await expect(revokeMock).rejects.toBe('[Authorization Util] [revoke] Missing driver');
      expect(mockGetDriver).not.toHaveBeenCalled();
      expect(mockError).toHaveBeenCalledWith('[Authorization Util] [revoke] Missing driver');
    });

    it('should log an error if unable to retrieve the driver', async () => {
      expect.assertions(4);
      mockGetDriver.mockReturnValueOnce(undefined);
      initialize(authConfig);
      const revokeMock = revoke('CLIENT_ID', 'DRIVER');

      await expect(revokeMock).rejects.toBe('[Authorization Util] [revoke] Missing driver');
      expect(mockGetDriver).toHaveBeenCalledWith('DRIVER');
      expect(mockHttpPost).not.toHaveBeenCalled();
      expect(mockError).toHaveBeenCalledWith('[Authorization Util] [revoke] Missing driver');
    });

    it('should run successfully if everything properly set', async () => {
      expect.assertions(4);
      initialize(authConfig);
      const revokeMock = revoke('CLIENT_ID', 'DRIVER');

      expect(revokeMock).resolves.toBeUndefined();
      expect(mockHttpPost).toHaveBeenCalledWith(expectedRequestUrl, expectedRequestTokens, expectedRequestHeaders);
      await Promise.all([mockHttpPost.mock.results[0].value]);
      expect(mockClearTokens).toHaveBeenCalled();
      expect(mockError).not.toHaveBeenCalled();
    });

    it('should log an error if service fails', async () => {
      expect.assertions(6);
      postSuccess = false;
      initialize(authConfig);
      const revokeMock = revoke('CLIENT_ID', 'DRIVER');

      await expect(revokeMock).rejects.toBe('mockError');
      expect(mockGetDriver).toHaveBeenCalledWith('DRIVER');
      expect(mockHttpPost).toHaveBeenCalledWith(expectedRequestUrl, expectedRequestTokens, expectedRequestHeaders);
      await expect(mockHttpPost).rejects.toBe('mockError');
      expect(mockClearTokens).not.toHaveBeenCalled();
      expect(mockError).toHaveBeenCalledWith('[Authorization Util] [revoke] Error revoking token: mockError');
    });

    it('should log a warning if tried with temporal identities auth type', async () => {
      expect.assertions(3);
      authConfig.AUTH_TYPE = 'TEMPORAL_IDENTITIES';
      initialize(authConfig);
      const revokeMock = revoke('CLIENT_ID', 'DRIVER');

      await expect(revokeMock).rejects.toBe('[Authorization Util] [revoke] Method not available for this clientId');
      expect(mockHasDriver).not.toHaveBeenCalled();
      expect(mockWarn).toHaveBeenCalledWith('[Authorization Util] [revoke] Method not available for this clientId');
    });

    it('should log a warning if tried with customer auth type', async () => {
      expect.assertions(3);
      authConfig.AUTH_TYPE = 'CUSTOMER';
      initialize(authConfig);
      const revokeMock = revoke('CLIENT_ID', 'DRIVER');

      await expect(revokeMock).rejects.toBe('[Authorization Util] [revoke] Method not available for this clientId');
      expect(mockHasDriver).not.toHaveBeenCalled();
      expect(mockWarn).toHaveBeenCalledWith('[Authorization Util] [revoke] Method not available for this clientId');
    });

    it('should log a warning for revokeEmployees, then call revoke', () => {
      expect.assertions(2);
      initialize(authConfig);
      const revokeMock = revokeEmployees('CLIENT_ID', 'DRIVER');
      expect(revokeMock).resolves.toBeUndefined();
      expect(mockWarn).toHaveBeenCalledWith('[Authorization Util] [revokeEmployees] deprecated method, call revoke instead');
    });
  });

  describe('getUserInfo', () => {
    beforeEach(() => {
      const data = {
        sub: 'mockSub',
        procedencia: 'mockProcedencia'
      };
      const stringifiedData = JSON.stringify(data);
      const b64 = window.btoa(stringifiedData);

      mockHttpGet.mockReturnValue({
        data: `mockAny.${b64}`
      } as DataManagerResponse<string>);
    });

    describe('not native', () => {
      it('should log an error if driver does not exist', async () => {
        expect.assertions(2);
        mockGetDriver.mockReturnValueOnce(undefined);
        await expect(getUserInfo()).rejects.toBe(false);
        expect(mockError).toHaveBeenCalledWith('[Authorization Util] [getUserInfo] Missing driver');
      });

      it('should work fine if response is well formatted', async () => {
        expect.assertions(2);
        mockParseJwt.mockReturnValueOnce({ sub: 'mockSub', procedencia: 'mockProcedencia', employee: 'true' });
        const response: UserInfoResponse = await getUserInfo();
        expect(response).toStrictEqual({ numpersona: 'mockSub', procedencia: 'mockProcedencia', empleado: 'true' });
        expect(mockError).not.toHaveBeenCalled();
      });

      it('should capture wrong response from user info service', async () => {
        expect.assertions(2);
        mockHttpGet.mockReturnValueOnce({
          data: 'mockWrongStringFormat'
        } as DataManagerResponse<string>);
        mockParseJwt.mockImplementationOnce(() => {
          throw new Error();
        });
        await expect(getUserInfo()).rejects.toBe(false);
        expect(mockError).toHaveBeenCalledWith('[Authorization Util] [getUserInfo] Error http request for userInfo: Error');
      });

      it('should remove leading zeros from numpersona', async () => {
        expect.assertions(2);
        mockParseJwt.mockReturnValueOnce({ sub: '001234', procedencia: 'mockProcedencia' });
        const response: UserInfoResponse = await getUserInfo();
        expect(response).toStrictEqual({ numpersona: '1234', procedencia: 'mockProcedencia', empleado: undefined });
        expect(mockError).not.toHaveBeenCalled();
      });
    });

    describe('native', () => {
      let mockEventManagerGetInstance: jest.MockedFunction<typeof EventManager.getInstance>;
      const mockUserInfoResponse: UserInfoEventResponse = { userInfo: 'mockJwtToken' };
      let mockPublishWithResponse: any;

      beforeEach(() => {
        mockIsNative.mockReturnValue(true);
        mockPublishWithResponse = jest.fn().mockImplementation(() => Promise.resolve(mockUserInfoResponse));
        mockEventManagerGetInstance = jest.fn().mockImplementation(() => ({
          publishWithResponse: mockPublishWithResponse
        })) as jest.MockedFunction<typeof EventManager.getInstance>;
        EventManager.getInstance = mockEventManagerGetInstance;
      });

      it('should return userInfo if everything works fine', async () => {
        expect.assertions(2);
        mockParseJwt.mockReturnValueOnce({
          sub: 'mockNumPersona'
        });
        const response: UserInfoResponse = await getUserInfo();
        expect(mockParseJwt).toHaveBeenCalledWith('mockJwtToken');
        expect(response).toStrictEqual({ numpersona: 'mockNumPersona', procedencia: undefined, empleado: undefined });
      });

      it('should fail if EventManager returns an error', async () => {
        expect.assertions(2);
        mockPublishWithResponse.mockImplementationOnce(() => {
          throw new Error();
        });
        await expect(getUserInfo()).rejects.toBe(false);
        expect(mockError).toHaveBeenCalledWith('[Authorization Util] [getUserInfo] Error native request for userInfo: Error');
      });

      it('should fail if recovered jwtToken is not valid', async () => {
        expect.assertions(2);
        mockPublishWithResponse.mockImplementationOnce(() => {
          throw new Error();
        });
        await expect(getUserInfo()).rejects.toBe(false);
        expect(mockError).toHaveBeenCalledWith('[Authorization Util] [getUserInfo] Error native request for userInfo: Error');
      });
    });
  });

  it('should return instance with methods (legacy)', () => {
    expect.assertions(1);
    const instance = AuthorizationUtils.getInstance();
    expect(instance).toStrictEqual({
      authorize: expect.any(Function),
      authenticate: expect.any(Function),
      getTokens: expect.any(Function)
    });
  });
});
