export interface SamlShellConfig {
  RESOURCES_URL: string;
  AUTHN_REQUEST_URL: string;
  NETSCALER_ACS_URL: string;
  ACS_RESPONSE_URL: string;
  AUTHN_REQUEST_METHOD: 'GET' | 'POST';
}
