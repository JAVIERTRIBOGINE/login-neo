export type AuthStepConfirmation = {
  title: string;
  description: string;
};

export interface OauthManagerConfig {
  endpoints: {
    authenticate: string;
  };
  resumeAuthId?: string;
  procedence?: string;
  language?: string;
  confirmStep?: (step: AuthStepConfirmation) => Promise<void>;
}

export interface OauthAuthorizeRequest {
  authorizeUrl: string;
  clientId: string;
  redirectUri: string;
  csrf?: string;
  scope?: string;
  responseType?: string;
  codeChallengeMethod?: string;
}

export interface OauthTokenExchangeRequest {
  tokenUrl: string;
  tokenId: string;
  code?: string | null;
  state?: string | null;
  clientId: string;
  redirectUri: string;
  codeVerifier?: string;
  dataManager?: string;
}

export interface SamlAuthorizationContext {
  authnRequestUrl: string;
  method: 'GET' | 'POST';
}

export enum OAUTH_MANAGER_EVENTS {
  AUTH_SUCCESS = 'OAUTH_MANAGER:SUCCESS',
  AUTH_ERROR = 'OAUTH_MANAGER:ERROR',
  REDIRECT_CREDENTIALS = 'OAUTH_MANAGER:REDIRECT_CREDENTIALS',
  SAML_AUTHORIZATION_REQUIRED = 'OAUTH_MANAGER:SAML_AUTHORIZATION_REQUIRED',
  SAML_AUTHORIZATION_SUCCESS = 'OAUTH_MANAGER:SAML_AUTHORIZATION_SUCCESS',
  SAML_AUTHORIZATION_ERROR = 'OAUTH_MANAGER:SAML_AUTHORIZATION_ERROR',
}

export interface OauthManagerEvent {
  type: OAUTH_MANAGER_EVENTS;
  payload?: unknown;
}
