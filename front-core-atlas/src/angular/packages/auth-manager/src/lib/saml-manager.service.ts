import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EventManager } from '@proteo/event-bus';
import { Subject, timeout } from 'rxjs';

import { AuthStepConfirmation } from './auth-manager.models';
import {
  SAML_MANAGER_EVENTS,
  SamlManagerConfig,
  SamlManagerEvent,
} from './saml-manager.models';

@Injectable({ providedIn: 'root' })
export class SamlManagerService {
  private readonly http = inject(HttpClient);
  private readonly eventSubject = new Subject<SamlManagerEvent>();

  readonly events$ = this.eventSubject.asObservable();

  private config!: SamlManagerConfig;

  setConfig(config: SamlManagerConfig): void {
    this.config = config;
  }

  checkResources(): void {
    this.http.get(this.config.endpoints.resources, { withCredentials: true }).pipe(
      timeout(10000)
    ).subscribe({
      next: response => void this.handleSuccess(response),
      error: error => void this.handleError(error as HttpErrorResponse | Error),
    });
  }

  async notifyUnauthorized(): Promise<void> {
    await this.confirm({
      title: 'Paso SAML: unauthorized',
      description: 'No hay una SAMLResponse válida. Se va a publicar SAML_UNAUTHORIZED.',
    });
    this.publish({ type: SAML_MANAGER_EVENTS.SAML_UNAUTHORIZED });
  }

  private async handleSuccess(response: unknown): Promise<void> {
    await this.confirm({
      title: 'Paso SAML: resources OK',
      description: `GET ${this.config.endpoints.resources} ha respondido 200 OK.`,
    });
    this.publish({ type: SAML_MANAGER_EVENTS.SAML_SUCCESS, payload: response });
  }

  private async handleError(error: HttpErrorResponse | Error): Promise<void> {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      await this.confirm({
        title: 'Paso SAML: 401 resources',
        description: `GET ${this.config.endpoints.resources} ha respondido 401. Se inicia SAML SP-Initiated.`,
      });
      this.publish({ type: SAML_MANAGER_EVENTS.AUTHN_REQUEST });
      return;
    }

    await this.confirm({
      title: 'Paso SAML: error',
      description: `GET ${this.config.endpoints.resources} ha fallado: ${this.describeError(error)}.`,
    });
    this.publish({ type: SAML_MANAGER_EVENTS.SAML_ERROR, payload: error });
  }

  private describeError(error: HttpErrorResponse | Error): string {
    if (error instanceof HttpErrorResponse) {
      return `${error.status || 'sin status'} ${error.statusText || 'Network error'}`;
    }
    return error.name === 'TimeoutError' ? 'timeout tras 10s' : error.message;
  }

  private confirm(step: AuthStepConfirmation): Promise<void> {
    return this.config.confirmStep?.(step) ?? Promise.resolve();
  }

  private publish(event: SamlManagerEvent): void {
    this.eventSubject.next(event);
    EventManager.getInstance().publish(event.type, event.payload);
  }
}
