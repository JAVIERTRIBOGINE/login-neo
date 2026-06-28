import { StorageManager } from '@proteo/storage-utils';
import { AuthorizeRequest, AuthorizeResponse, DataManagerResponse, TokensRequest, TokensResponse } from "@proteo/types";
import { base64UrlEncode, sha256 } from '@proteo/string-utils';
import { environment } from "src/environments/environment";
import { getDriver } from "@proteo/data-manager";
import { getAuthorizeEndpoint } from "./oauth-endpoints";

const DEFAULT_CONTENT_TYPE = 'application/x-www-form-urlencoded';
const useLocalMockEndpoints = environment.name === 'local';

const getConfiguredDriver = () => {
  if (useLocalMockEndpoints) return null;

  const driverName = window.BsAuthorizationConfig?.dataManager;
  if (!driverName) return null;

  try {
    return getDriver(driverName);
  } catch {
    return null;
  }
};

const responseHeadersToRecord = (headers: Headers): Record<string, string> => {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
};

const toDataManagerResponse = <T>(response: Response, data?: T, url = response.url): DataManagerResponse<T> => ({
  data,
  status: response.status,
  statusText: response.statusText,
  headers: responseHeadersToRecord(response.headers),
  redirected: response.redirected,
  url,
});

const postJson = async <T>(url: string, body: Record<string, unknown>): Promise<DataManagerResponse<T>> => {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Accept-Language': 'es_ES',
      'Content-Language': 'es-ES',
    },
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json') ? await response.json() as T : undefined;

  if (!response.ok) {
    throw toDataManagerResponse<T>(response, data);
  }

  const redirectUrl = data && typeof data === 'object' && 'url' in data ? String(data.url) : response.url;
  return toDataManagerResponse(response, data, redirectUrl);
};

const postFormAndLeaveApp = <T>(url: string, params: URLSearchParams): Promise<DataManagerResponse<T>> => {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = url;

  params.forEach((value, name) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();

  return new Promise<DataManagerResponse<T>>(() => undefined);
};


/**
 * GET TOKENS */

export const getTokens = async (url: string, tokenId: string, request: TokensRequest): Promise<DataManagerResponse<TokensResponse>> => {

  codeStateBackwardCompatibility(request);

  const { code, state } = request;

  if (!code) {
    throw new Error('[Authentication] Missing param code');
  }

  if (!state) {
    throw new Error('[Authentication] Missing param state');
  }

  if (state !== StorageManager.getInstance().get('STATE')) {
    throw new Error('[Authentication] Invalid param state');
  }

  const client_Id_SecretValue = request.clientId + ":";
  const header_auth_value = btoa(client_Id_SecretValue);

  const headers: Record<string, string> = {
    'Accept-Language': 'ES-es',
    'Content-Type': DEFAULT_CONTENT_TYPE,
    'Content-Language': 'ES-es',
    'Authorization': 'Basic ' + header_auth_value,
    'Cookie': tokenId
  };

  const body = {
    grant_type: 'authorization_code',
    redirect_uri: request.redirectUri,
    code_verifier: request.codeVerifier || StorageManager.getInstance().get('CODE_VERIFIER'),
    code
  };
  StorageManager.getInstance().remove('STATE');
  StorageManager.getInstance().remove('CODE_VERIFIER');
  const driver = getConfiguredDriver();
  if (!driver) {
    return postJson<TokensResponse>(url, body);
  }
  return driver.post<TokensResponse>(url, body, headers);
};

export const codeStateBackwardCompatibility = (request: TokensRequest) => {
  const { code, state } = request;
  if (!code || !state) {
    let params;
    if (history.state && history.state.data) {
      params = history.state.data.params;
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      params = {
        state: urlParams.get('state'),
        code: urlParams.get('code')
      };
    }
    request.code = code || params.code;
    request.state = state || params.state;
  }
};

/**
 * AUTHORIZE
 */


/**** temporal code resplicating authorization-utils Proteo one
 */

const HEX_BASE = 16;

export function generateRandomString(length = 56, digitsByItem = 2): string {
  const array = new Uint32Array(length / digitsByItem);
  window.crypto.getRandomValues(array);
  return Array.from(array, getNumbers(digitsByItem)).join('');
}

export function getNumbers(digits: number) {
  return (decimal: number) => decimal.toString(HEX_BASE).padStart(digits, '0').slice(-digits);
}

export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const hashed = await sha256(codeVerifier);
  return base64UrlEncode(hashed);
}

export const authorize = async (request: AuthorizeRequest): Promise<DataManagerResponse<AuthorizeResponse>> => {

  const url = getAuthorizeEndpoint();
  const state = generateRandomString();
  const codeVerifier = generateRandomString();
  const code_challenge = (await generateCodeChallenge(codeVerifier));

  StorageManager.getInstance().set('STATE', state);
  StorageManager.getInstance().set('CODE_VERIFIER', codeVerifier);



  const params = new URLSearchParams({
    response_type: request.responseType || 'code',
    client_id: request.clientId,
    code_challenge_method: request.codeChallengeMethod ?? 'S256',
    scope: request.scope ?? '',
    redirect_uri: request.redirectUri,
    state: state,
    code_challenge
  })

  const token_id = request.csrf || localStorage.getItem("token_id") || "";
  if (token_id) {
    params.set('assertion', token_id);
    params.set('csrf', token_id);
  }

  return postFormAndLeaveApp<AuthorizeResponse>(url, params);
}
