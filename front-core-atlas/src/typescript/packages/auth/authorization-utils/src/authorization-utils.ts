import { clearTokens, getDriver, hasDriver, storedTokens } from '@proteo/data-manager';
import { StorageManager } from '@proteo/storage-utils';
import type {
  AuthConfig,
  AuthenticateRequest,
  AuthenticateResponse,
  AuthenticationType,
  AuthorizationTokens,
  AuthorizeRequest,
  AuthorizeResponse,
  DataManagerResponse,
  TokensRequest,
  TokensResponse,
  UserInfoEventResponse,
  UserInfoResponse,
  UserInfoServiceResponse
} from '@proteo/types';
import { USER_INFO_DRIVER, USER_INFO_ENDPOINT, urls } from './authentication-configuration.js';
import { generateCodeChallenge } from './utils/generateCodeChallenge.js';
import { generateRandomString } from './utils/generateRandomString.js';
import { LoggerUtils } from '@proteo/logger-utils';
import { I18n } from '@proteo/i18n-utils';
import { isNative } from '@proteo/platform-utils';
import { EventManager } from '@proteo/event-bus';
import { parseJwt } from '@proteo/string-utils';
import { AuthUserInfo } from './auth-user-info.js';

const DEFAULT_AUTH_TYPE = 'TEMPORAL_IDENTITIES' as AuthenticationType;

export const DEFAULT_REDIRECT_URI = '[YOUR_REDIRECT_URI]';
export const DEFAULT_CLIENT_ID = '[YOUR_CLIENT_ID]';
const MISSING_DRIVER_MESSAGE = '[Authentication] Missing Driver';
const DEFAULT_CONTENT_TYPE = 'application/x-www-form-urlencoded';

export const isAuthInitialized = (): boolean => {
  return window.BsAuthorizationConfig && window.BsAuthorizationConfig.url !== undefined;
};

/**
 * Initialize component and saves it as singleton
 *
 * @param {AuthConfig} authConfig authentication config
 */
export const initialize = (authConfig: AuthConfig) => {
  let { AUTH_TYPE = DEFAULT_AUTH_TYPE } = authConfig;
  const { DATA_MANAGER, CLIENT_ID, SCOPES, REDIRECT_URI } = authConfig;
  if (!urls[AUTH_TYPE]) {
    LoggerUtils.getInstance().warn('[Authorization] No proper AUTH_TYPE found, TEMPORAL_IDENTITIES set by default');
    AUTH_TYPE = 'TEMPORAL_IDENTITIES';
  }
  window.BsAuthorizationConfig = {
    type: AUTH_TYPE,
    url: urls[AUTH_TYPE],
    dataManager: DATA_MANAGER,
    clientID: CLIENT_ID,
    scopes: SCOPES,
    redirectUri: REDIRECT_URI
  };
};

/**
 * Performs a http request for authentication
 *
 * @param {AuthenticateRequest} request authenticate request
 * @returns {Promise<DataManagerResponse<AuthenticateResponse>>} authentication response (empty)
 */
export const authenticate = async (request: AuthenticateRequest) => {
  const { authenticate: url } = window.BsAuthorizationConfig.url;
  const basic = `Basic ${window.btoa(request.userId + ':' + request.password)}`;
  const headers = { Authorization: basic };
  const driver = getDriver(window.BsAuthorizationConfig.dataManager);
  if (!driver) {
    throw new Error(MISSING_DRIVER_MESSAGE);
  }
  return driver.post<AuthenticateResponse>(url, undefined, headers);
};

/**
 * Performs a http request for authorization
 *
 * @param {AuthorizeRequest} request authorization request
 * @returns {Promise<DataManagerResponse<AuthorizeResponse>>} authorization response (empty)
 */
export const authorize = async (request: AuthorizeRequest): Promise<DataManagerResponse<AuthorizeResponse>> => {
  const { authorize: url } = window.BsAuthorizationConfig.url;

  const params: Record<string, string> = {
    client_id: request.clientId,
    redirect_uri: request.redirectUri,
    response_type: request.responseType || 'code',
    state: request.state || generateRandomString()
  };

  StorageManager.getInstance().set('STATE', params.state);

  params.code_challenge_method = request.codeChallengeMethod || 'S256';
  // Allow backward compatibility
  if (request.codeChallenge) {
    params.code_challenge = request.codeChallenge;
  } else {
    const codeVerifier = generateRandomString();
    StorageManager.getInstance().set('CODE_VERIFIER', codeVerifier);
    params.code_challenge = await generateCodeChallenge(codeVerifier);
  }

  if (request.scope) {
    params.scope = request.scope;
  }

  if (request.csrf) {
    params.csrf = request.csrf;
  }

  const driver = getDriver(window.BsAuthorizationConfig.dataManager);
  if (!driver) {
    throw new Error(MISSING_DRIVER_MESSAGE);
  }
  // Special case: some authorize endpoints are get (ex. temporal-identities), others are post (ex. employees)
  if (request.method && request.method === 'post') {
    const headers = {
      'Content-Type': DEFAULT_CONTENT_TYPE,
      Accept: 'application/json'
    };
    return driver.post(url, params, headers);
  } else {
    return driver.get(url, {}, params);
  }
};

/**
 * Performs tokens requests obtaining oauth and oidc tokens from AM
 * @param request tokens requests
 * @returns {DataManagerResponse<TokensResponse>} oauth and oidc tokens
 */
export const getTokens = async (request: TokensRequest): Promise<DataManagerResponse<TokensResponse>> => {
  // Allow backward compatibility
  codeStateBackwardCompatibility(request);

  const { code, state } = request;

  if (!code) {
    throw new Error('[Authentication] Missing param code');
  }

  if (!state) {
    throw new Error('[Authentication] Missing param state');
  }

  if (state !== StorageManager.getInstance().get('STATE')) {
    throw new Error('[Authentication] Invalid param state');
  }
  const { token: url } = window.BsAuthorizationConfig.url;

  const headers: Record<string, string> = { 'Content-Type': DEFAULT_CONTENT_TYPE };

  // For employees authentication, client id is defined into body as client_id, for other endpoints as clientId
  const clientIdKey = window.BsAuthorizationConfig.type === 'EMPLOYEES' ? 'client_id' : 'clientId';

  const body = {
    grant_type: 'authorization_code',
    [clientIdKey]: request.clientId,
    redirect_uri: request.redirectUri,
    code_verifier: request.codeVerifier || StorageManager.getInstance().get('CODE_VERIFIER'),
    code
  };
  StorageManager.getInstance().remove('STATE');
  StorageManager.getInstance().remove('CODE_VERIFIER');
  const driver = getDriver(window.BsAuthorizationConfig.dataManager);
  if (!driver) {
    throw new Error(MISSING_DRIVER_MESSAGE);
  }
  return driver.post<TokensResponse>(url, body, headers);
};

const codeStateBackwardCompatibility = (request: TokensRequest) => {
  const { code, state } = request;
  if (!code || !state) {
    let params;
    if (history.state && history.state.data) {
      params = history.state.data.params;
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      params = {
        state: urlParams.get('state'),
        code: urlParams.get('code')
      };
    }
    request.code = code || params.code;
    request.state = state || params.state;
  }
};

/**
 * @deprecated Use endSession instead
 */
export const endSessionEmployees = (clientId: string, driver: string) => {
  LoggerUtils.getInstance().warn(
    '[Authorization Util] [endSessionEmployees] deprecated method, call endSession instead'
  );
  return endSession(clientId, driver);
};

/**
 * Finishes current session for given clientId and driver
 * For now only available for Employee clientIds
 * @param clientId clientId which session is to be finished
 * @param driver driver name to use to finish session
 */
export const endSession = (clientId: string, driver: string): Promise<void> => {
  if (window.BsAuthorizationConfig.type !== 'EMPLOYEES' && window.BsAuthorizationConfig.type !== 'LIGHT_USERS') {
    const error = '[Authorization Util] [endSession] Method not available for this clientId';
    LoggerUtils.getInstance().warn('[Authorization Util] [endSession] Method not available for this clientId');
    return Promise.reject(error);
  }
  if (hasDriver(driver)) {
    const endSessionDriver = getDriver(driver);
    if (endSessionDriver) {
      return new Promise((resolve, reject) => {
        const { endSession: url } = window.BsAuthorizationConfig.url;
        const idTokenHint = (storedTokens() as unknown as AuthorizationTokens).OIDC;
        const endPoint = `${url}?id_token_hint=${idTokenHint}&client_id=${clientId}`;
        endSessionDriver
          .get(endPoint)
          .then(() => resolve())
          .catch((error) => {
            LoggerUtils.getInstance().error(`[Authorization Util] [endSession] Error ending session: ${error}`);
            reject(error);
          });
      });
    }
  }
  const errorMissingDriverError = '[Authorization Util] [endSession] Missing driver';

  LoggerUtils.getInstance().error(errorMissingDriverError);
  return Promise.reject(errorMissingDriverError);
};

/**
 * @deprecated Use revoke instead
 */
export const revokeEmployees = (clientId: string, driver: string) => {
  LoggerUtils.getInstance().warn('[Authorization Util] [revokeEmployees] deprecated method, call revoke instead');
  return revoke(clientId, driver);
};

/**
 * Revokes tokens for given clientId and driver
 * For now only available for Employee clientIds
 * @param clientId clientId which tokens are to be revoked
 * @param driver driver name to use to revoke drivers
 */
export const revoke = (clientId: string, driver: string): Promise<void> => {
  if (window.BsAuthorizationConfig.type !== 'EMPLOYEES' && window.BsAuthorizationConfig.type !== 'LIGHT_USERS') {
    const error = '[Authorization Util] [revoke] Method not available for this clientId';
    LoggerUtils.getInstance().warn(error);
    return Promise.reject(error);
  }
  if (hasDriver(driver)) {
    const revokeDriver = getDriver(driver);
    if (revokeDriver) {
      const { revoke: url } = window.BsAuthorizationConfig.url;
      const oauth = (storedTokens() as unknown as AuthorizationTokens).OAUTH;
      const body = {
        token: oauth
      };
      const headers: Record<string, string> = { Accept: 'application/json' };
      headers['content-type'] = DEFAULT_CONTENT_TYPE;
      headers['content-language'] = I18n.getInstance().isoLanguage;
      headers['accept-language'] = I18n.getInstance().isoLanguage;
      headers['Authorization'] = `Basic ${window.btoa(clientId + ':')}`;
      return new Promise((resolve, reject) => {
        revokeDriver
          .post(`${url}`, body, headers)
          .then(() => {
            clearTokens();
            resolve();
          })
          .catch((error) => {
            LoggerUtils.getInstance().error(`[Authorization Util] [revoke] Error revoking token: ${error}`);
            reject(error);
          });
      });
    }
  }
  const errorMissingDriver = '[Authorization Util] [revoke] Missing driver';
  LoggerUtils.getInstance().error(errorMissingDriver);
  return Promise.reject(errorMissingDriver);
};

/**
 * Returns user info for current session
 * For native requests the userInfo through EventManager and bridge as it is managed there
 * For other cases it requires a proper driver to fetch it
 * @returns { Promise<UserInfoResponse>} user info for current session
 */
export const getUserInfo = async (): Promise<UserInfoResponse> => {
  if (isNative()) {
    const payload = {
      method: 'getUserInfo'
    };
    try {
      const response = await EventManager.getInstance().publishWithResponse<UserInfoEventResponse>(
        'GET_USER_INFO',
        payload
      );
      const userInfo = extractUserInfoFromToken(response.userInfo);
      AuthUserInfo.set(userInfo);
      return userInfo;
    } catch (error) {
      LoggerUtils.getInstance().error(`[Authorization Util] [getUserInfo] Error native request for userInfo: ${error}`);
      return Promise.reject(false);
    }
  } else {
    const partyAuthenticationDriver = getDriver(USER_INFO_DRIVER);
    if (partyAuthenticationDriver) {
      try {
        const response: DataManagerResponse<string> = await partyAuthenticationDriver.get(USER_INFO_ENDPOINT);
        const userInfo = extractUserInfoFromToken(response.data as string);
        AuthUserInfo.set(userInfo);
        return userInfo;
      } catch (error) {
        LoggerUtils.getInstance().error(`[Authorization Util] [getUserInfo] Error http request for userInfo: ${error}`);
      }
    }
    LoggerUtils.getInstance().error('[Authorization Util] [getUserInfo] Missing driver');
    return Promise.reject(false);
  }
};

export const extractUserInfoFromToken = (jwtToken: string): UserInfoResponse => {
  const data: UserInfoServiceResponse = parseJwt<UserInfoServiceResponse>(jwtToken);
  return {
    numpersona: /^\d+$/.test(data.sub) ? String(Number(data.sub)) : data.sub,
    procedencia: data.procedencia,
    empleado: data.employee
  } as UserInfoResponse;
};

const instance = {
  authenticate,
  authorize,
  getTokens
};

/**
 * @deprecated use initialize
 */
export const initInstance = initialize;

/**
 * Returns the instance class
 * @deprecated import methods that you need (authenticate, authorize, getTokens)
 */
const getInstance = () => {
  return instance;
};

/**
 * @deprecated import functions that you need
 */
export const AuthorizationUtils = {
  getInstance,
  initialize,
  initInstance
};
