/**
 * Authentication Type to select configuration for urls authentication and authorization
 */
export type AuthenticationType = 'TEMPORAL_IDENTITIES' | 'EMPLOYEES' | 'CUSTOMER' | 'LIGHT_USERS';

/**
 * Main Auth config structure
 */
export type AuthConfig = {
  DATA_MANAGER: string;
  AUTH_TYPE: AuthenticationType;
  CLIENT_ID: string;
  REDIRECT_URI: string;
  SCOPES?: string[];
  CLIENT_SECRET?: string;
};

/** SAML endpoints supplied by the Shell to authentication-capable MFEs. */
export type SamlConfig = {
  RESOURCES_URL: string;
  AUTHN_REQUEST_URL: string;
  NETSCALER_ACS_URL: string;
  ACS_RESPONSE_URL: string;
  AUTHN_REQUEST_METHOD: 'GET' | 'POST';
};

export type WindowAuthConfig = {
  type: AuthenticationType;
  url: AuthorizationUrls;
  dataManager: string;
  clientID: string;
  scopes?: string[];
  redirectUri: string;
  saml?: SamlConfig;
};

/**
 * Authentication configuration for every type
 */
export type AuthorizationUrls = {
  authenticate: string;
  authorize: string;
  token: string;
  endSession?: string;
  revoke?: string;
};

/**
 * Authenticate request
 */
export type AuthenticateRequest = {
  /**
   * User identifier
   */
  userId: string;

  /**
   * User password
   */
  password: string;
};

/**
 * Authenticate response
 */
export type AuthenticateResponse = {
  ssoToken?: string;
};

/**
 * Authorize request
 */
export type AuthorizeRequest = {
  /**
   * Client Id
   */
  clientId: string;

  /**
   * Redirection uri
   */
  redirectUri: string;

  /**
   * HTTP method for authorize
   */
  method?: 'get' | 'post';

  /**
   * Code Challenge
   */
  codeChallenge?: string;

  /**
   * Code Challenge method
   */
  codeChallengeMethod?: string;

  /**
   * State number for requests correlation
   */
  state?: string;

  /**
   * Client Id scope
   */
  scope?: string;

  /**
   * SSO Token
   */
  csrf?: string;

  /**
   * Response type
   */
  responseType?: string;
};

/**
 * Authorize response
 */
export type AuthorizeResponse = {
  location?: string;
};

/**
 * Get Tokens request
 */
export type TokensRequest = {
  /**
   * Client Id
   */
  clientId: string;

  /**
   * Redirect Uri
   */
  redirectUri: string;

  /**
   * Authorization code
   */
  code?: string;

  /**
   * Code Verifier
   */
  codeVerifier?: string;

  /**
   * State
   */
  state?: string;
};

/**
 * Get Tokens response
 */
export type TokensResponse = {
  /**
   * Access Token
   */
  access_token: string;

  /**
   * Refresh Token
   */
  refresh_token: string;

  /**
   * Scope
   */
  scope: string;

  /**
   * Id Token (OIDC)
   */
  id_token: string;

  /**
   * Token Type
   */
  token_type: string;

  /**
   * Expiration seconds
   */
  expires_in: string;
};

/**
 * User info response
 */
export type UserInfoResponse = {
  /**
   * numpersona
   */
  numpersona: string;

  /**
   * procedencia
   */
  procedencia: string;

  /**
   * empleado
   */
  empleado?: string;
};

export interface UserInfoServiceResponse {
  /**
   * numpersona
   */
  sub: string;

  /**
   * procedencia
   */
  procedencia: string;

  /**
   * empleado
   */
  employee?: string;
}
