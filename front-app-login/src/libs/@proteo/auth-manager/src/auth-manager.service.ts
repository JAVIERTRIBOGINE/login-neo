import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Subject } from 'rxjs';
import { filter, from, map } from 'rxjs';
import { EventManager } from '@proteo/event-bus';
import { getDriver, hasDriver } from '@proteo/data-manager';
import { DataManagerResponse } from '@proteo/types';
import { FlowConfirmationModalService } from '@app/login/application/services/flow-confirmation-modal.service';

import { AuthManagerConfig } from './models/auth-config.model';
import { AUTH_MANAGER_EVENTS, AuthManagerEvent } from './models/auth-events.enum';

const DRIVER           = 'PARTY_AUTHENTICATION';
const REDIRECT_CB      = 'RedirectCallback';
const HTTP_CB          = 'HttpCallback';
const NAME_CB          = 'NameCallback';
const PASSWORD_CB      = 'PasswordCallback';

@Injectable({ providedIn: 'root' })
export class AuthManagerService {

  private http = inject(HttpClient);
  private flowConfirmation = inject(FlowConfirmationModalService);

  private _events$ = new Subject<AuthManagerEvent>();
  readonly events$  = this._events$.asObservable();

  // authId preservado entre llamadas — estado interno del árbol PingAM
  private authId = '';
  private config!: AuthManagerConfig;

  // ─── Entry point ────────────────────────────────────────────────────────────

  async authenticate(config: AuthManagerConfig): Promise<void> {
    this.config = config;

    if (config.resumeAuthId) {
      await this.flowConfirmation.confirm({
        title: 'Paso OAuth: resume',
        description: 'Se ha detectado authId en la URL. Se va a retomar el arbol de autenticacion.',
      });
      // Caso 2: PingAM redirigió aquí tras fallo EntraID — retomar árbol
      this.authId = config.resumeAuthId;
      this.resumeAuth(config.resumeAuthId);
    } else {
      await this.flowConfirmation.confirm({
        title: 'Paso OAuth: inicio',
        description: 'Se va a iniciar el arbol de autenticacion con POST /authenticate.',
      });
      // Caso 1: inicio del flujo — POST vacío
      this.initiateAuth();
    }
  }

  // Llamado desde LoginComponent tras submit del formulario de credenciales (Caso 4)
  async submitCredentials(username: string, password: string): Promise<void> {
    await this.flowConfirmation.confirm({
      title: 'Paso OAuth: credenciales',
      description: 'Se van a enviar usuario y password al arbol de autenticacion.',
    });

    this.credentialsAuth(username, password);
  }

  // ─── Casos internos ─────────────────────────────────────────────────────────

  // Caso 1 — POST vacío → RedirectCallback (EntraID)
  private async initiateAuth(): Promise<void> {
    await this.flowConfirmation.confirm({
      title: 'Paso OAuth: POST inicial',
      description: 'Se va a ejecutar POST /authenticate sin body para pedir el primer callback.',
    });

    this.makeDriverCall({}).subscribe({
      next:  (response) => this.handleCallbackResponse(response),
      error: (error)    => this.handleError(error),
    });
  }

  // Caso 2 — POST con authId → HttpCallback (Kerberos)
  private async resumeAuth(authId: string): Promise<void> {
    await this.flowConfirmation.confirm({
      title: 'Paso OAuth: POST resume',
      description: 'Se va a ejecutar POST /authenticate con authId para continuar el arbol.',
    });

    this.makeDriverCall({ authId }).subscribe({
      next:  (response) => this.handleCallbackResponse(response),
      error: (error)    => this.handleError(error),
    });
  }

  // Caso 3 — POST con authId + callbacks + withCredentials → ISuccessOtpRespone
  private async kerberosAuth(authId: string, callbacks: unknown[]): Promise<void> {
    await this.flowConfirmation.confirm({
      title: 'Paso OAuth: Kerberos',
      description: 'PingAM ha pedido HttpCallback. Se va a reintentar con credenciales de navegador.',
    });

    const url     = this.config.endpoints.authenticate;
    const headers = this.buildHeaders();

    this.http.post<Record<string, unknown>>(
      url,
      { authId, callbacks },
      { headers: new HttpHeaders(headers), withCredentials: true }
    ).subscribe({
      next:  (response) => this.handleSuccess(response),
      error: (error)    => this.handleError(error),
    });
  }

  // Caso 4 — POST con authId + NameCallback + PasswordCallback → ISuccessOtpRespone
  private async credentialsAuth(username: string, password: string): Promise<void> {
    const body = {
      authId: this.authId,
      callbacks: [
        { type: 'NameCallback',     output: [{ name: 'prompt', value: 'User Name' }], input: [{ name: 'IDToken1', value: username }] },
        { type: 'PasswordCallback', output: [{ name: 'prompt', value: 'Password'  }], input: [{ name: 'IDToken2', value: password  }] },
      ],
    };

    this.makeDriverCall(body).subscribe({
      next:  (response) => this.handleSuccess(response),
      error: (error)    => this.handleError(error),
    });
  }

  // ─── Gestión de respuestas ───────────────────────────────────────────────────

  private async handleCallbackResponse(response: Record<string, unknown>): Promise<void> {
    if (response['authId']) this.authId = response['authId'] as string;

    const callbackType = (response['callbacks'] as { type: string }[] | undefined)?.[0]?.type;

    if (callbackType === REDIRECT_CB) {
      await this.flowConfirmation.confirm({
        title: 'Paso OAuth: RedirectCallback',
        description: 'PingAM ha devuelto RedirectCallback. Se va a redirigir al proveedor externo.',
      });
      this.submitRedirectCallback(response['callbacks'] as { output: { name: string; value: string }[] }[]);
    } else if (callbackType === HTTP_CB) {
      await this.flowConfirmation.confirm({
        title: 'Paso OAuth: HttpCallback',
        description: 'PingAM ha devuelto HttpCallback. Se va a continuar por Kerberos.',
      });
      this.kerberosAuth(this.authId, response['callbacks'] as unknown[]);
    } else if (callbackType === NAME_CB || callbackType === PASSWORD_CB) {
      await this.flowConfirmation.confirm({
        title: 'Paso OAuth: formulario',
        description: 'PingAM solicita usuario y password. Se va a mostrar el formulario de credenciales.',
      });
      this.requestCredentials();
    } else if (this.isSuccess(response)) {
      this.handleSuccess(response);
    }
  }

  private async handleSuccess(response: Record<string, unknown>): Promise<void> {
    await this.flowConfirmation.confirm({
      title: 'Paso OAuth: autenticacion OK',
      description: 'PingAM ha respondido con tokenId. Se va a publicar AUTH_SUCCESS.',
    });

    const event: AuthManagerEvent = { type: AUTH_MANAGER_EVENTS.AUTH_SUCCESS, payload: response };
    this._events$.next(event);
    EventManager.getInstance().publish(AUTH_MANAGER_EVENTS.AUTH_SUCCESS, response);
  }

  private async handleError(error: HttpErrorResponse): Promise<void> {
    if (error.status === 401) {
      await this.flowConfirmation.confirm({
        title: 'Paso OAuth: 401 authenticate',
        description: 'POST /authenticate ha respondido 401. Se va a solicitar formulario de credenciales.',
      });
      this.requestCredentials();
    } else {
      await this.flowConfirmation.confirm({
        title: 'Paso OAuth: error',
        description: 'POST /authenticate ha respondido con error no controlado. Se va a publicar AUTH_ERROR.',
      });

      const event: AuthManagerEvent = { type: AUTH_MANAGER_EVENTS.AUTH_ERROR, payload: error };
      this._events$.next(event);
      EventManager.getInstance().publish(AUTH_MANAGER_EVENTS.AUTH_ERROR, { error });
    }
  }

  // ─── Utilidades ─────────────────────────────────────────────────────────────

  private makeDriverCall(body: Record<string, unknown>) {
    const url     = this.config.endpoints.authenticate;
    const headers = this.buildHeaders();
    const useLocalHttp = url.startsWith('/') || url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1');
    const driver  = !useLocalHttp && hasDriver(DRIVER) ? getDriver(DRIVER)! : null;

    if (!driver) {
      return this.http.post<Record<string, unknown>>(url, body, {
        headers: new HttpHeaders(headers),
        withCredentials: true,
      });
    }

    return from(driver.post<Record<string, unknown>>(url, body, headers)).pipe(
      filter((r: DataManagerResponse<Record<string, unknown>>) => !!r.data),
      map((r: DataManagerResponse<Record<string, unknown>>)    => r.data as Record<string, unknown>)
    );
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.config.language)   headers['Accept-Language'] = this.config.language;
    if (this.config.procedence) headers['Procedence']      = this.config.procedence;
    return headers;
  }

  private async requestCredentials(): Promise<void> {
    const event: AuthManagerEvent = { type: AUTH_MANAGER_EVENTS.REDIRECT_CREDENTIALS };
    this._events$.next(event);
    EventManager.getInstance().publish(AUTH_MANAGER_EVENTS.REDIRECT_CREDENTIALS);
  }

  private async submitRedirectCallback(callbacks: { output: { name: string; value: string }[] }[]): Promise<void> {
    const redirectUrl = callbacks[0]?.output.find(o => o.name === 'redirectUrl')?.value;
    if (!redirectUrl) return;

    await this.flowConfirmation.confirm({
      title: 'Paso OAuth: submit redirect',
      description: 'Se va a enviar un formulario GET hacia la URL de RedirectCallback.',
    });

    const url  = new URL(redirectUrl);
    const form = document.createElement('form');
    form.method = 'GET';
    form.action = url.origin + url.pathname;

    url.searchParams.forEach((value, key) => {
      const input  = document.createElement('input');
      input.type   = 'hidden';
      input.name   = key;
      input.value  = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  }

  private isSuccess(response: Record<string, unknown>): boolean {
    return 'tokenId' in response && !!response['tokenId'];
  }
}
