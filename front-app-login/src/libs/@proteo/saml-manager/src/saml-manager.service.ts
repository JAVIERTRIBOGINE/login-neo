import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, timeout } from 'rxjs';
import { EventManager } from '@proteo/event-bus';
import { ROUTE_DATA } from '@app/login/domain/constants/path.constant';
import { FlowConfirmationModalService } from '@app/login/application/services/flow-confirmation-modal.service';
import { skipSamlResourcesOnce } from '@app/app.routes';

import { SamlManagerConfig } from './models/saml-config.model';
import { SAML_MANAGER_EVENTS, SamlManagerEvent } from './models/saml-events.enum';

@Injectable({ providedIn: 'root' })
export class SamlManagerService {

  private http = inject(HttpClient);
  private router = inject(Router);
  private flowConfirmation = inject(FlowConfirmationModalService);

  private _events$ = new Subject<SamlManagerEvent>();
  readonly events$  = this._events$.asObservable();

  private config!: SamlManagerConfig;

  // ─── Configuración ──────────────────────────────────────────────────────────

  setConfig(config: SamlManagerConfig): void {
    this.config = config;
  }

  // ─── Llamadas del flujo ─────────────────────────────────────────────────────

  // Llamadas 1 y 6 — mismo método, ResourcesComponent lo invoca en ambos casos
  checkResources(): void {
    console.log('[SAML] GET /resources start', this.config.endpoints.resources);
    this.http.get(this.config.endpoints.resources, { withCredentials: true }).pipe(
      timeout(10000)
    ).subscribe({
      next:  (response) => {
        console.log('[SAML] GET /resources success', response);
        this.handleSuccess(response);
      },
      error: (error: HttpErrorResponse | Error) => {
        console.log('[SAML] GET /resources error', error);
        this.handleError(error);
      },
    });
  }

  // Llamada 5 — invocado desde SamlResponseComponent
  async submitSamlResponse(samlResponse: string, relayState: string): Promise<void> {
    await this.flowConfirmation.confirm({
      title: 'Paso SAML: ACS NetScaler',
      description: 'Se va a enviar SAMLResponse y RelayState hacia la ACS de NetScaler.',
    });

    // PENDIENTE: ACS URL exacta de NetScaler (context-SAML.md secc. 4 y 14)
    this.submitForm(this.config.endpoints.netscalerAcs, 'POST', {
      SAMLResponse: samlResponse,
      RelayState:   relayState,
    });
  }

  // Caso alternativo (sección 6) — SSO Cookie inválida/ausente
  async notifyUnauthorized(): Promise<void> {
    await this.flowConfirmation.confirm({
      title: 'Paso SAML: unauthorized',
      description: 'No hay SAMLResponse valida. Se va a publicar el evento SAML_UNAUTHORIZED.',
    });

    const event: SamlManagerEvent = { type: SAML_MANAGER_EVENTS.SAML_UNAUTHORIZED };
    this._events$.next(event);
    EventManager.getInstance().publish(SAML_MANAGER_EVENTS.SAML_UNAUTHORIZED);
  }

  // ─── Gestión de respuestas ───────────────────────────────────────────────────

  private async handleSuccess(response: unknown): Promise<void> {
    await this.flowConfirmation.confirm({
      title: 'Paso SAML: resources OK',
      description: `Llamada: GET ${this.config.endpoints.resources}. Respuesta: 200 OK. Se va a publicar SAML_SUCCESS.`,
    });

    const event: SamlManagerEvent = { type: SAML_MANAGER_EVENTS.SAML_SUCCESS, payload: response };
    this._events$.next(event);
    EventManager.getInstance().publish(SAML_MANAGER_EVENTS.SAML_SUCCESS, response);
  }

  private async handleError(error: HttpErrorResponse | Error): Promise<void> {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      await this.flowConfirmation.confirm({
        title: 'Paso SAML: 401 resources',
        description: `Llamada: GET ${this.config.endpoints.resources}. Respuesta: 401 Unauthorized. Accion: navegar a ROUTE_DATA.ROOT sin relanzar resources.`,
      });

      console.log('[SAML] navigate ROOT after resources 401');
      const event: SamlManagerEvent = { type: SAML_MANAGER_EVENTS.AUTHN_REQUEST };
      this._events$.next(event);
      EventManager.getInstance().publish(SAML_MANAGER_EVENTS.AUTHN_REQUEST);

      if (this.isNeoShell()) {
        this.router.navigate([ROUTE_DATA.LOGIN]);
      } else {
        skipSamlResourcesOnce();
        this.router.navigate([ROUTE_DATA.ROOT]);
      }
    } else {
      await this.flowConfirmation.confirm({
        title: 'Paso SAML: error',
        description: `Llamada: GET ${this.config.endpoints.resources}. Respuesta: ${this.describeResourcesError(error)}. Se va a publicar SAML_ERROR.`,
      });

      const event: SamlManagerEvent = { type: SAML_MANAGER_EVENTS.SAML_ERROR, payload: error };
      this._events$.next(event);
      EventManager.getInstance().publish(SAML_MANAGER_EVENTS.SAML_ERROR, { error });
    }
  }

  private describeResourcesError(error: HttpErrorResponse | Error): string {
    if (error instanceof HttpErrorResponse) {
      return `${error.status || 'sin status'} ${error.statusText || 'Network error'}`;
    }

    return error.name === 'TimeoutError' ? 'timeout tras 10s' : error.message;
  }

  private isNeoShell(): boolean {
    return Boolean((window as Window & { NEO_SHELL?: boolean }).NEO_SHELL);
  }

  // ─── Utilidades ─────────────────────────────────────────────────────────────

  // Reutiliza el patrón submitRedirectCallback de auth-manager.service.ts,
  // generalizado a GET/POST con parámetros arbitrarios (llamadas 2 y 5)
  private submitForm(action: string, method: 'GET' | 'POST', params: Record<string, string>): void {
    const form = document.createElement('form');
    form.method = method;
    form.action = action;

    Object.entries(params).forEach(([name, value]) => {
      const input  = document.createElement('input');
      input.type   = 'hidden';
      input.name   = name;
      input.value  = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  }
}
