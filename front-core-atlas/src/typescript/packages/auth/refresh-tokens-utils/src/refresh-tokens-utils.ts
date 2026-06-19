import { EventManager } from '@proteo/event-bus';
import { LoggerUtils } from '@proteo/logger-utils';
import type {
  AuthorizationTokens,
  AuthPayload,
  RefreshTokensEventResponsePayload,
  RequestRefreshTokensBridgeRequest
} from '@proteo/types';

// TODO: Duplicated with authorization-utils, needs refactor
const DEFAULT_REDIRECT_URI = '[YOUR_REDIRECT_URI]';
const DEFAULT_CLIENT_ID = '[YOUR_CLIENT_ID]';

/**
 * Last requested tokens for authorization
 */
let storedTokens: AuthorizationTokens = { OAUTH: '', OIDC: '' };

/**
 * Last timestamp from requested tokens
 */
let lastRequestTokensTimestamp = 0;

/**
 * Guard time for requesting new tokens (10 seconds)
 */
const GUARD = 10000;

const populateBridgeClientData = (bridgeRequest: RequestRefreshTokensBridgeRequest) => {
  const data: AuthPayload = {};
  if (window.BsAuthorizationConfig?.clientID && window.BsAuthorizationConfig.clientID !== DEFAULT_CLIENT_ID) {
    data.clientId = window.BsAuthorizationConfig.clientID;
  }
  if (window.BsAuthorizationConfig?.redirectUri && window.BsAuthorizationConfig.redirectUri !== DEFAULT_REDIRECT_URI) {
    data.redirectUri = window.BsAuthorizationConfig.redirectUri;
  }
  if (Object.keys(data).length > 0) {
    bridgeRequest.data = data;
  }
};

/**
 * Performs a request for obtaining new tokens to portal or host
 * @returns {AuthorizationTokens} new oauth tokens
 */
export const refreshTokens = async (): Promise<AuthorizationTokens> => {
  function manageRefreshTokensError(error: unknown) {
    LoggerUtils.getInstance().error(`[refresh-token-utils] ${error}`, {
      remoteLogger: true,
      type: 'application'
    });
    throw new Error(`[refresh-token-utils] ${error}`);
  }
  const now = new Date().getTime();
  if (now - lastRequestTokensTimestamp > GUARD) {
    LoggerUtils.getInstance().warn('[refresh-token-utils] Token Expired => requesting new tokens', {
      remoteLogger: true,
      type: 'application'
    });
    lastRequestTokensTimestamp = now;
    try {
      const event = 'REQUEST_REFRESH_TOKENS';
      const bridgeRequest: RequestRefreshTokensBridgeRequest = { method: 'requestRefreshTokens' };
      populateBridgeClientData(bridgeRequest);
      const response: RefreshTokensEventResponsePayload =
        await EventManager.getInstance().publishWithResponse<RefreshTokensEventResponsePayload>(event, bridgeRequest);
      if (response.error) {
        manageRefreshTokensError(response.error);
      }
      LoggerUtils.getInstance().debug(
        '[refresh-token-utils] new tokens received, returning to store into data manager',
        {
          remoteLogger: true,
          type: 'application'
        }
      );
      storedTokens = response as AuthorizationTokens;
    } catch (error: unknown) {
      manageRefreshTokensError(error);
    }
  } else {
    LoggerUtils.getInstance().debug(
      '[refresh-token-utils] requesting new tokens with less than guard time, returning stored tokens',
      {
        remoteLogger: true,
        type: 'application'
      }
    );
  }
  return storedTokens;
};

/**
 * Clear authorization tokens and reset last request tokens time
 */
export const clearTokens = () => {
  lastRequestTokensTimestamp = 0;
  storedTokens = { OAUTH: '', OIDC: '' };
  LoggerUtils.getInstance().debug('[authorization-utils] clear tokens stored');
};

const instance = {
  refreshTokens,
  clearTokens
};

/**
 * Returns the instance class
 * @deprecated import methods as needed
 */
const getInstance = () => instance;

/**
 * @deprecated import methods as needed
 */

export const RefreshTokensUtils = {
  getInstance
};
