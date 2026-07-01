import type { AuthStepConfirmation } from './oauth-manager.models';

export interface SamlManagerConfig {
  endpoints: {
    resources: string;
    authnRequest: string;
    netscalerAcs: string;
    acsResponse: string;
  };
  authnRequestMethod: 'GET' | 'POST';
  confirmStep?: (step: AuthStepConfirmation) => Promise<void>;
}

export enum SAML_MANAGER_EVENTS {
  SAML_SUCCESS = 'SAML_MANAGER:SUCCESS',
  AUTHN_REQUEST = 'SAML_MANAGER:AUTHN_REQUEST',
  SAML_UNAUTHORIZED = 'SAML_MANAGER:UNAUTHORIZED',
  SAML_ERROR = 'SAML_MANAGER:ERROR',
}

export interface SamlManagerEvent {
  type: SAML_MANAGER_EVENTS;
  payload?: unknown;
}
