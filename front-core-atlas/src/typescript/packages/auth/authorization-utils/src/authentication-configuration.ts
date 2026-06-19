import type { AuthenticationType, AuthorizationUrls } from '@proteo/types';

/**
 * Authentication configuration
 */
export const urls: Record<AuthenticationType, AuthorizationUrls> = {
  TEMPORAL_IDENTITIES: {
    authenticate: '/digital/party-authentication/v2/temporal-identities/authentication',
    authorize: '/digital/party-authentication/v2/web/oauth2/authorize',
    token: '/global/v1/oauth2/token'
  },
  EMPLOYEES: {
    authenticate: '/employees/party-authentication/v1/authentication',
    authorize: '/employees/party-authentication/v1/oauth2/authorize',
    token: '/employees/party-authentication/v1/oauth2/token',
    endSession: '/employees/party-authentication/v1/end-session',
    revoke: '/employees/party-authentication/v1/oauth2/revoke'
  },
  CUSTOMER: {
    authenticate: '/digital/party-authentication/v3/authentication',
    authorize: '/digital/party-authentication/v3/oauth2/authorize',
    token: '/digital/party-authentication/v3/oauth2/token'
  },
  LIGHT_USERS: {
    authenticate: '/digital/party-authentication/v4/light-users/authenticate',
    authorize: '/digital/party-authentication/v4/oauth2/authorize',
    token: '/digital/party-authentication/v4/oauth2/token',
    endSession: '/digital/party-authentication/v4/end-session',
    revoke: '/digital/party-authentication/v4/oauth2/revoke'
  }
};

export const USER_INFO_DRIVER = 'PARTY_AUTHENTICATION';
export const USER_INFO_ENDPOINT = '/userinfo';
