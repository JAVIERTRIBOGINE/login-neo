import { SamlManagerConfig } from '@proteo/saml-manager';
import { environment } from 'src/environments/environment';

// PENDIENTE: cuando el contrato SAML se cierre con Arquitectura/Citrix, leer estas
// URLs desde window.BsAuthorizationConfig.url (igual que los endpoints OAuth en
// login), con fallback a environment.saml.* como ahora.
export function buildSamlManagerConfig(): SamlManagerConfig {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  return {
    endpoints: {
      resources:    isLocalhost ? 'http://localhost:8082/resources' : environment.saml.resourcesUrl,
      authnRequest: isLocalhost ? 'http://localhost:8082/authnRequest' : environment.saml.authnRequestUrl,
      netscalerAcs: isLocalhost ? 'http://localhost:8082/validateSAMLResponse' : environment.saml.netscalerAcsUrl,
    },
    authnRequestMethod: environment.saml.authnRequestMethod,
  };
}
