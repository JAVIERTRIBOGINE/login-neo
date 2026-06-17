export enum SAML_MANAGER_EVENTS {
  SAML_SUCCESS      = 'SAML_MANAGER:SUCCESS',       // GET /resources -> 200 (llamadas 1 y 6)
  AUTHN_REQUEST     = 'SAML_MANAGER:AUTHN_REQUEST', // GET /resources -> 401, navega al flujo OAuth
  SAML_UNAUTHORIZED = 'SAML_MANAGER:UNAUTHORIZED',  // SamlResponseComponent sin SAMLResponse válida (sección 6)
  SAML_ERROR        = 'SAML_MANAGER:ERROR',
}

export interface SamlManagerEvent {
  type: SAML_MANAGER_EVENTS;
  payload?: unknown;
}
