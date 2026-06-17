import { tEnvName } from "@app/login/domain/constants/global.constants";

export const environment = {
  name: "pre"  as tEnvName,
  configBasePath: 'conf/app/login/v1/',
  auth: null,
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
}
