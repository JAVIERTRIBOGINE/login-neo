import { clearTokens, getDriver, hasDriver, storedTokens } from "@proteo/data-manager";
import { I18n } from "@proteo/i18n-utils";
import { LoggerUtils } from "@proteo/logger-utils";
import { AuthorizationTokens } from "@proteo/types";


export const DEFAULT_REDIRECT_URI = '[YOUR_REDIRECT_URI]';
export const DEFAULT_CLIENT_ID = '[YOUR_CLIENT_ID]';
//const MISSING_DRIVER_MESSAGE = '[Authentication] Missing Driver';
const DEFAULT_CONTENT_TYPE = 'application/x-www-form-urlencoded';

/**
 * Finishes current session for given clientId and driver
 * For now only available for Employee clientIds
 * @param clientId clientId which session is to be finished
 * @param driver driver name to use to finish session
 */
export const endSession = (clientId: string, driver: string) => {
    if (window.BsAuthorizationConfig.type !== 'EMPLOYEES' && window.BsAuthorizationConfig.type !== 'LIGHT_USERS') {
      LoggerUtils.getInstance().warn('[Authorization Util] [endSession] Method not available for this clientId');
      return;
    }
    if (hasDriver(driver)) {
      const endSessionDriver = getDriver(driver);
      if (endSessionDriver) {
        const { endSession: url } = window.BsAuthorizationConfig.url;
        const idTokenHint = (storedTokens() as unknown as AuthorizationTokens).OIDC;
        const endPoint = `${url}?id_token_hint=${idTokenHint}&client_id=${clientId}`;
        endSessionDriver.get(endPoint).catch((error) => {
          LoggerUtils.getInstance().error(`[Authorization Util] [endSession] Error ending session: ${error}`);
        });
        return;
      }
    }
    LoggerUtils.getInstance().error('[Authorization Util] [endSession] Missing driver');
  };
  

  
  /**
   * Revokes tokens for given clientId and driver
   * For now only available for Employee clientIds
   * @param clientId clientId which tokens are to be revoked
   * @param driver driver name to use to revoke drivers
   */
  export const revoke = (clientId: string, driver: string) => {
    if (window.BsAuthorizationConfig.type !== 'EMPLOYEES' && window.BsAuthorizationConfig.type !== 'LIGHT_USERS') {
      LoggerUtils.getInstance().warn('[Authorization Util] [revoke] Method not available for this clientId');
      return;
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
        revokeDriver
          .post(`${url}`, body, headers)
          .then(() => {
            clearTokens();
          })
          .catch((error) => {
            LoggerUtils.getInstance().error(`[Authorization Util] [revoke] Error revoking token: ${error}`);
          });
        return;
      }
    }
    LoggerUtils.getInstance().error('[Authorization Util] [revoke] Missing driver');
  };