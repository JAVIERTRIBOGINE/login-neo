import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { getDriver, hasDriver } from '@proteo/data-manager';
import { EventManager } from '@proteo/event-bus';
import { StorageManager } from '@proteo/storage-utils';
import { base64UrlEncode, sha256 } from '@proteo/string-utils';
import type { DataManagerResponse, AuthorizeResponse, TokensResponse } from '@proteo/types';
import { filter, from, map, Subject } from 'rxjs';

import { OAUTH_MANAGER_EVENTS } from './oauth-manager.models';
import type {
  OauthManagerConfig,
  OauthManagerEvent,
  AuthStepConfirmation,
  OauthAuthorizeRequest,
  OauthTokenExchangeRequest,
  SamlAuthorizationContext,
} from './oauth-manager.models';

const DRIVER = 'PARTY_AUTHENTICATION';
const DEFAULT_CONTENT_TYPE = 'application/x-www-form-urlencoded';
const HEX_BASE = 16;
const REDIRECT_CB = 'RedirectCallback';
const HTTP_CB = 'HttpCallback';
const NAME_CB = 'NameCallback';
const PASSWORD_CB = 'PasswordCallback';

interface AuthCallback {
  type: string;
  output: { name: string; value: unknown }[];
  input?: { name: string; value: unknown }[];
  _id?: number;
}

@Injectable({ providedIn: 'root' })
export class OauthManagerService {
  private readonly http = inject(HttpClient);
  private readonly eventSubject = new Subject<OauthManagerEvent>();

  readonly events$ = this.eventSubject.asObservable();

  private authId = '';
  private credentialCallbacks: AuthCallback[] = [];
  private config!: OauthManagerConfig;

  async authenticate(config: OauthManagerConfig): Promise<void> {
    this.config = config;

    if (config.resumeAuthId) {
      await this.confirm({
        title: 'Paso OAuth: fallback transparente completo',
        description: 'Tras el redirect a Entra ID, PingAM procesa el error, prueba Kerberos ADGBS.com y Atenea, y devuelve 303 /login?authId=....',
      });
      this.authId = config.resumeAuthId;
      this.resumeAuth(config.resumeAuthId);
      return;
    }

    await this.confirm({
      title: 'Paso OAuth: inicio',
      description: 'Se va a iniciar el árbol de autenticación con POST /authenticate.',
    });
    this.initiateAuth();
  }

  /** Coordina la transición de sesión Citrix ausente hacia el flujo SAML SP-Initiated. */
  requireSamlAuthorization(context: SamlAuthorizationContext): void {
    this.publish({
      type: OAUTH_MANAGER_EVENTS.SAML_AUTHORIZATION_REQUIRED,
      payload: context,
    });
  }

  completeSamlAuthorization(payload?: unknown): void {
    this.publish({ type: OAUTH_MANAGER_EVENTS.SAML_AUTHORIZATION_SUCCESS, payload });
  }

  failSamlAuthorization(error?: unknown): void {
    this.publish({ type: OAUTH_MANAGER_EVENTS.SAML_AUTHORIZATION_ERROR, payload: error });
  }

  async submitCredentials(username: string, password: string): Promise<void> {
    this.credentialsAuth(username, password);
  }

  async authorize(request: OauthAuthorizeRequest): Promise<DataManagerResponse<AuthorizeResponse>> {
    const state = this.generateRandomString();
    const codeVerifier = this.generateRandomString();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    StorageManager.getInstance().set('STATE', state);
    StorageManager.getInstance().set('CODE_VERIFIER', codeVerifier);

    const params = new URLSearchParams({
      response_type: request.responseType || 'code',
      client_id: request.clientId,
      code_challenge_method: request.codeChallengeMethod ?? 'S256',
      scope: request.scope ?? '',
      redirect_uri: request.redirectUri,
      state,
      code_challenge: codeChallenge,
    });

    const tokenId = request.csrf || localStorage.getItem('token_id') || '';
    if (tokenId) {
      params.set('assertion', tokenId);
      params.set('csrf', tokenId);
    }

    return this.postFormAndLeaveApp<AuthorizeResponse>(request.authorizeUrl, params);
  }

  async exchangeAuthorizationCode(request: OauthTokenExchangeRequest): Promise<DataManagerResponse<TokensResponse>> {
    const code = request.code || this.getQueryParam('code');
    const state = request.state || this.getQueryParam('state');

    if (!code) {
      throw new Error('[Authentication] Missing param code');
    }

    if (!state) {
      throw new Error('[Authentication] Missing param state');
    }

    if (state !== StorageManager.getInstance().get('STATE')) {
      throw new Error('[Authentication] Invalid param state');
    }

    const headers = this.buildTokenHeaders(request.clientId, request.tokenId);
    const body = {
      grant_type: 'authorization_code',
      redirect_uri: request.redirectUri,
      code_verifier: request.codeVerifier || StorageManager.getInstance().get('CODE_VERIFIER'),
      code,
    };

    StorageManager.getInstance().remove('STATE');
    StorageManager.getInstance().remove('CODE_VERIFIER');

    const driver = this.getTokenDriver(request.dataManager);
    if (!driver) {
      return this.postJson<TokensResponse>(request.tokenUrl, body);
    }

    return driver.post<TokensResponse>(request.tokenUrl, body, headers);
  }

  private initiateAuth(): void {
    this.makeDriverCall({}).subscribe({
      next: response => void this.handleCallbackResponse(response),
      error: error => void this.handleError(error as HttpErrorResponse),
    });
  }

  private resumeAuth(authId: string): void {
    this.makeDriverCall({ authId }).subscribe({
      next: response => void this.handleCallbackResponse(response),
      error: error => void this.handleError(error as HttpErrorResponse),
    });
  }

  private credentialsAuth(username: string, password: string): void {
    const body = {
      authId: this.authId,
      callbacks: this.buildCredentialCallbacks(username, password),
    };

    this.makeDriverCall(body).subscribe({
      next: response => void this.handleSuccess(response),
      error: error => void this.handleError(error as HttpErrorResponse),
    });
  }

  private async handleCallbackResponse(response: Record<string, unknown>): Promise<void> {
    if (response['authId']) this.authId = response['authId'] as string;
    const callbacks = response['callbacks'] as AuthCallback[] | undefined;
    const callbackType = callbacks?.[0]?.type;

    if (callbackType === REDIRECT_CB && callbacks) {
      await this.submitRedirectCallback(callbacks);
    } else if (callbackType === HTTP_CB) {
      await this.confirm({
        title: 'Paso OAuth: HttpCallback no esperado',
        description: 'PingAM ha devuelto HttpCallback. El contrato objetivo requiere que Kerberos se resuelva internamente en PingAM.',
      });
      this.publish({ type: OAUTH_MANAGER_EVENTS.AUTH_ERROR, payload: response });
    } else if (callbackType === NAME_CB || callbackType === PASSWORD_CB) {
      this.credentialCallbacks = callbacks ?? [];
      await this.confirm({
        title: 'Paso OAuth: resume',
        description: 'Tras volver a /login con authId, Angular reanuda el árbol. PingAM devuelve NameCallback y PasswordCallback con 200 OK.',
      });
      this.publish({ type: OAUTH_MANAGER_EVENTS.REDIRECT_CREDENTIALS });
    } else if (this.isSuccess(response)) {
      await this.handleSuccess(response);
    }
  }

  private async handleSuccess(response: Record<string, unknown>): Promise<void> {
    await this.confirm({
      title: 'Paso OAuth: autenticación OK',
      description: 'PingAM ha respondido con tokenId. Se va a publicar AUTH_SUCCESS.',
    });
    this.publish({ type: OAUTH_MANAGER_EVENTS.AUTH_SUCCESS, payload: response });
  }

  private async handleError(error: HttpErrorResponse): Promise<void> {
    this.publish({ type: OAUTH_MANAGER_EVENTS.AUTH_ERROR, payload: error });
  }

  private makeDriverCall(body: Record<string, unknown>) {
    const url = this.config.endpoints.authenticate;
    const headers = this.buildHeaders();
    const localHttp = url.startsWith('/') || url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1');
    const driver = !localHttp && hasDriver(DRIVER) ? getDriver(DRIVER) : null;

    if (!driver) {
      return this.http.post<Record<string, unknown>>(url, body, {
        headers: new HttpHeaders(headers),
        withCredentials: true,
      });
    }

    return from(driver.post<Record<string, unknown>>(url, body, headers)).pipe(
      filter((response: DataManagerResponse<Record<string, unknown>>) => Boolean(response.data)),
      map((response: DataManagerResponse<Record<string, unknown>>) => response.data as Record<string, unknown>)
    );
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.config.language) headers['Accept-Language'] = this.config.language;
    if (this.config.procedence) headers['Procedence'] = this.config.procedence;
    return headers;
  }

  private async submitRedirectCallback(callbacks: AuthCallback[]): Promise<void> {
    const rawRedirectUrl = callbacks[0]?.output.find(output => output.name === 'redirectUrl')?.value;
    const redirectUrl = typeof rawRedirectUrl === 'string' ? rawRedirectUrl : '';
    if (!redirectUrl) return;

    await this.confirm({
      title: 'Paso OAuth: RedirectCallback hacia Entra ID',
      description: 'PingAM ha respondido RedirectCallback. Angular crea un formulario GET con redirectUrl y el navegador sale hacia Entra ID/PingAM.',
    });

    const url = new URL(redirectUrl);
    const form = document.createElement('form');
    form.method = 'GET';
    form.action = url.origin + url.pathname;
    url.searchParams.forEach((value, name) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  }

  private postFormAndLeaveApp<T>(url: string, params: URLSearchParams): Promise<DataManagerResponse<T>> {
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
  }

  private async postJson<T>(url: string, body: Record<string, unknown>): Promise<DataManagerResponse<T>> {
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
      throw this.toDataManagerResponse<T>(response, data);
    }

    const redirectUrl = data && typeof data === 'object' && 'url' in data ? String(data.url) : response.url;
    return this.toDataManagerResponse(response, data, redirectUrl);
  }

  private toDataManagerResponse<T>(response: Response, data?: T, url = response.url): DataManagerResponse<T> {
    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: this.responseHeadersToRecord(response.headers),
      redirected: response.redirected,
      url,
    };
  }

  private responseHeadersToRecord(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  private buildTokenHeaders(clientId: string, tokenId: string): Record<string, string> {
    const clientSecretValue = `${clientId}:`;
    const authValue = btoa(clientSecretValue);

    return {
      'Accept-Language': 'ES-es',
      'Content-Type': DEFAULT_CONTENT_TYPE,
      'Content-Language': 'ES-es',
      'Authorization': `Basic ${authValue}`,
      'Cookie': tokenId,
    };
  }

  private getTokenDriver(dataManager?: string) {
    const windowConfig = window as Window & { BsAuthorizationConfig?: { dataManager?: string } };
    const driverName = dataManager ?? windowConfig.BsAuthorizationConfig?.dataManager;
    if (!driverName) return null;

    try {
      return getDriver(driverName);
    } catch {
      return null;
    }
  }

  private getQueryParam(key: string): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(key);
  }

  private generateRandomString(length = 56, digitsByItem = 2): string {
    const array = new Uint32Array(length / digitsByItem);
    window.crypto.getRandomValues(array);
    return Array.from(array, (decimal) => decimal.toString(HEX_BASE).padStart(digitsByItem, '0').slice(-digitsByItem)).join('');
  }

  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const hashed = await sha256(codeVerifier);
    return base64UrlEncode(hashed);
  }

  private isSuccess(response: Record<string, unknown>): boolean {
    return Boolean(response['tokenId']);
  }

  private buildCredentialCallbacks(username: string, password: string): AuthCallback[] {
    const callbacks = this.credentialCallbacks.length > 0
      ? this.credentialCallbacks
      : [
          { type: NAME_CB, output: [{ name: 'prompt', value: 'User Name' }], input: [{ name: 'IDToken1', value: '' }] },
          { type: PASSWORD_CB, output: [{ name: 'prompt', value: 'Password' }], input: [{ name: 'IDToken2', value: '' }] },
        ];

    return callbacks.map((callback) => {
      if (callback.type === NAME_CB) {
        return this.withCallbackInput(callback, 'IDToken1', username);
      }
      if (callback.type === PASSWORD_CB) {
        return this.withCallbackInput(callback, 'IDToken2', password);
      }
      return this.cloneCallback(callback);
    });
  }

  private withCallbackInput(callback: AuthCallback, inputName: string, value: string): AuthCallback {
    const cloned = this.cloneCallback(callback);
    const inputs = cloned.input ?? [];
    const existing = inputs.find((input) => input.name === inputName);

    if (existing) {
      existing.value = value;
    } else {
      inputs.push({ name: inputName, value });
    }

    return { ...cloned, input: inputs };
  }

  private cloneCallback(callback: AuthCallback): AuthCallback {
    return {
      ...callback,
      output: callback.output.map((output) => ({ ...output })),
      input: callback.input?.map((input) => ({ ...input })),
    };
  }

  private confirm(step: AuthStepConfirmation): Promise<void> {
    return this.config.confirmStep?.(step) ?? Promise.resolve();
  }

  private publish(event: OauthManagerEvent): void {
    this.eventSubject.next(event);
    EventManager.getInstance().publish(event.type, event.payload);
  }
}
