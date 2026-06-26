export type AuthStepConfirmation = {
  title: string;
  description: string;
};

export interface AuthManagerConfig {
  endpoints: {
    authenticate: string;
  };
  resumeAuthId?: string;
  procedence?: string;
  language?: string;
  confirmStep?: (step: AuthStepConfirmation) => Promise<void>;
}

export interface SamlAuthorizationContext {
  authnRequestUrl: string;
  method: 'GET' | 'POST';
}

export enum AUTH_MANAGER_EVENTS {
  AUTH_SUCCESS = 'AUTH_MANAGER:SUCCESS',
  AUTH_ERROR = 'AUTH_MANAGER:ERROR',
  REDIRECT_CREDENTIALS = 'AUTH_MANAGER:REDIRECT_CREDENTIALS',
  SAML_AUTHORIZATION_REQUIRED = 'AUTH_MANAGER:SAML_AUTHORIZATION_REQUIRED',
  SAML_AUTHORIZATION_SUCCESS = 'AUTH_MANAGER:SAML_AUTHORIZATION_SUCCESS',
  SAML_AUTHORIZATION_ERROR = 'AUTH_MANAGER:SAML_AUTHORIZATION_ERROR',
}

export interface AuthManagerEvent {
  type: AUTH_MANAGER_EVENTS;
  payload?: unknown;
}
