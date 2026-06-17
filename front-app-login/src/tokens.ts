import { InjectionToken } from '@angular/core';

/**
 * Represents the structure of the local authentication tokens.
 */
export interface LocalAuthToken {
  access_token: string;
  id_token: string;
}

/**
 * Represents the injection token for the local authentication token.
 * The token contains an access token and an ID token.
 */
export const LOCAL_AUTH_TOKEN: InjectionToken<LocalAuthToken> = new InjectionToken('LOCAL_AUTH_TOKEN');
