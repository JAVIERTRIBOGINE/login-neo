import { tEnvName } from '@app/login/domain/constants/global.constants';
import tokens from '@config/tokens.json';

export const environment = {
  name: "local" as tEnvName,
  configBasePath: 'conf/',
  auth: { ...tokens },
  endpoints: {
    authenticate: 'http://localhost:8081/digital/party-authentication/v4/light-users/authenticate',
    authorize: 'http://localhost:8081/digital/party-authentication/v4/oauth2/authorize',
    tokens: 'http://localhost:8081/digital/party-authentication/v4/oauth2/token',
  },
  saml: {
    resourcesUrl: 'http://localhost:8082/resources',
    authnRequestUrl: 'http://localhost:8082/authnRequest',
    authnRequestMethod: 'GET' as 'GET' | 'POST',
    netscalerAcsUrl: 'http://localhost:8082/validateSAMLResponse',
  },
};
