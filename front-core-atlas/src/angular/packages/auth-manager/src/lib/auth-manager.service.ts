import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { getDriver, hasDriver } from '@proteo/data-manager';
import { EventManager } from '@proteo/event-bus';
import { DataManagerResponse } from '@proteo/types';
import { filter, from, map, Subject } from 'rxjs';

import {
  AUTH_MANAGER_EVENTS,
  AuthManagerConfig,
  AuthManagerEvent,
  AuthStepConfirmation,
  SamlAuthorizationContext,
} from './auth-manager.models';

const DRIVER = 'PARTY_AUTHENTICATION';
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
export class AuthManagerService {
  private readonly http = inject(HttpClient);
  private readonly eventSubject = new Subject<AuthManagerEvent>();

  readonly events$ = this.eventSubject.asObservable();

  private authId = '';
  private credentialCallbacks: AuthCallback[] = [];
  private config!: AuthManagerConfig;

  async authenticate(config: AuthManagerConfig): Promise<void> {
    this.config = config;

    if (config.resumeAuthId) {
      await this.confirm({
        title: 'Paso OAuth: resume',
        description: 'Se ha detectado authId en la URL. Se va a retomar el árbol de autenticación.',
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
      type: AUTH_MANAGER_EVENTS.SAML_AUTHORIZATION_REQUIRED,
      payload: context,
    });
  }

  completeSamlAuthorization(payload?: unknown): void {
    this.publish({ type: AUTH_MANAGER_EVENTS.SAML_AUTHORIZATION_SUCCESS, payload });
  }

  failSamlAuthorization(error?: unknown): void {
    this.publish({ type: AUTH_MANAGER_EVENTS.SAML_AUTHORIZATION_ERROR, payload: error });
  }

  async submitCredentials(username: string, password: string): Promise<void> {
    await this.confirm({
      title: 'Paso OAuth: credenciales',
      description: 'Se van a enviar usuario y password al árbol de autenticación.',
    });
    this.credentialsAuth(username, password);
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
      this.publish({ type: AUTH_MANAGER_EVENTS.AUTH_ERROR, payload: response });
    } else if (callbackType === NAME_CB || callbackType === PASSWORD_CB) {
      this.credentialCallbacks = callbacks ?? [];
      await this.confirm({
        title: 'Paso OAuth: fallback transparente completo',
        description: 'PingAM ha probado Entra ID, Kerberos ADGBS.com y Kerberos Atenea internamente; devuelve NameCallback y PasswordCallback con 200 OK.',
      });
      this.publish({ type: AUTH_MANAGER_EVENTS.REDIRECT_CREDENTIALS });
    } else if (this.isSuccess(response)) {
      await this.handleSuccess(response);
    }
  }

  private async handleSuccess(response: Record<string, unknown>): Promise<void> {
    await this.confirm({
      title: 'Paso OAuth: autenticación OK',
      description: 'PingAM ha respondido con tokenId. Se va a publicar AUTH_SUCCESS.',
    });
    this.publish({ type: AUTH_MANAGER_EVENTS.AUTH_SUCCESS, payload: response });
  }

  private async handleError(error: HttpErrorResponse): Promise<void> {
    if (error.status === 401) {
      this.publish({ type: AUTH_MANAGER_EVENTS.REDIRECT_CREDENTIALS });
      return;
    }
    this.publish({ type: AUTH_MANAGER_EVENTS.AUTH_ERROR, payload: error });
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

    if (redirectUrl.includes('localhost') || redirectUrl.includes('mock-entra-id')) {
      this.resumeAuth(this.authId);
      return;
    }

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

  private publish(event: AuthManagerEvent): void {
    this.eventSubject.next(event);
    EventManager.getInstance().publish(event.type, event.payload);
  }
}
