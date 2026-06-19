import { environment } from 'src/environments/environment';

const SHELL_LOCAL_PORT = '4300';

const shellProxyEndpoints = {
  authenticate: '/digital/party-authentication/v4/light-users/authenticate',
  authorize: '/digital/party-authentication/v4/oauth2/authorize',
  tokens: '/digital/party-authentication/v4/oauth2/token',
};

const isLocalShellRuntime = (): boolean =>
  environment.name === 'local' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname) &&
  window.location.port === SHELL_LOCAL_PORT;

export const getAuthenticateEndpoint = (): string => {
  if (isLocalShellRuntime()) return shellProxyEndpoints.authenticate;
  if (environment.name === 'local') return environment.endpoints.authenticate;
  return window.BsAuthorizationConfig?.url?.authenticate ?? environment.endpoints.authenticate;
};

export const getAuthorizeEndpoint = (): string => {
  if (isLocalShellRuntime()) return shellProxyEndpoints.authorize;
  if (environment.name === 'local') return environment.endpoints.authorize;
  return window.BsAuthorizationConfig?.url?.authorize ?? environment.endpoints.authorize;
};

export const getTokensEndpoint = (): string => {
  if (isLocalShellRuntime()) return shellProxyEndpoints.tokens;
  if (environment.name === 'local') return environment.endpoints.tokens;
  return window.BsAuthorizationConfig?.url?.token ?? environment.endpoints.tokens;
};
