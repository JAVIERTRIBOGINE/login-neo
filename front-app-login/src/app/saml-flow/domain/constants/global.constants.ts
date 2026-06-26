import { SamlManagerConfig } from '@proteo/auth-manager';
import { SamlShellConfig } from '../models/saml-shell-config.model';

export function buildSamlManagerConfig(config: SamlShellConfig): SamlManagerConfig {
  return {
    endpoints: {
      resources: config.RESOURCES_URL,
      authnRequest: config.AUTHN_REQUEST_URL,
      netscalerAcs: config.NETSCALER_ACS_URL,
      acsResponse: config.ACS_RESPONSE_URL,
    },
    authnRequestMethod: config.AUTHN_REQUEST_METHOD,
  };
}
