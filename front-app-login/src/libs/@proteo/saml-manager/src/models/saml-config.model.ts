export interface SamlManagerConfig {
  endpoints: {
    resources: string;
    authnRequest: string;
    netscalerAcs: string;
  };
  authnRequestMethod: 'GET' | 'POST'; // PENDIENTE confirmar con Citrix/back (context-SAML.md secc. 3 y 14)
}
