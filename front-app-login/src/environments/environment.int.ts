import { tEnvName } from '@app/login/domain/constants/global.constants';
import tokens from '@config/tokens.json';

export const environment = {
  name: "int"  as tEnvName,
  configBasePath: 'conf/app/login/v1/',
  auth: { ...tokens },
  endpoints: {
    authenticate: '/digital/party-authentication/v4/light-users/authenticate',
    authorize: '/digital/party-authentication/v4/oauth2/authorize',
    tokens: '/digital/party-authentication/v4/oauth2/token',
  },
  saml: {
    resourcesUrl: '/resources',
    authnRequestUrl: '/authnRequest',
    authnRequestMethod: 'GET' as 'GET' | 'POST',
    netscalerAcsUrl: '',
  },
};
