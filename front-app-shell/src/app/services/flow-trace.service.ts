import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface FlowTraceStep {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  diagram: FlowTraceDiagram;
  completed: boolean;
}

export interface FlowTraceDiagram {
  left: string;
  right: string;
  request: string;
  response: string;
}

export const NEO_FLOW_STEP_EVENT = 'neoFlowStep';
export const NEO_FLOW_STEP_NEXT_EVENT = 'neoFlowStepNext';

@Injectable({ providedIn: 'root' })
export class FlowTraceService {
  private readonly stepsSubject = new BehaviorSubject<FlowTraceStep[]>([]);

  readonly steps$ = this.stepsSubject.asObservable();

  addStep(step: Pick<FlowTraceStep, 'id' | 'title' | 'description'>): void {
    const timestamp = new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date());

    this.stepsSubject.next([
      ...this.stepsSubject.value,
      {
        ...step,
        timestamp,
        diagram: this.createDiagram(step),
        completed: false,
      },
    ]);
  }

  completeStep(id: string): void {
    this.stepsSubject.next(
      this.stepsSubject.value.map((step) =>
        step.id === id ? { ...step, completed: true } : step
      )
    );
  }

  clear(): void {
    this.stepsSubject.next([]);
  }

  private createDiagram(step: Pick<FlowTraceStep, 'title' | 'description'>): FlowTraceDiagram {
    const text = `${step.title} ${step.description}`.toLowerCase();

    if (text.includes('401 resources')) {
      return {
        left: 'Neo Angular',
        right: 'NetScaler',
        request: 'GET /resources',
        response: '401 Unauthorized',
      };
    }

    if (text.includes('resources ok')) {
      return {
        left: 'Neo Angular',
        right: 'NetScaler',
        request: 'GET /resources',
        response: '200 OK recursos',
      };
    }

    if (text.includes('post inicial') || text.includes('oauth: inicio')) {
      return {
        left: 'Neo Angular',
        right: 'Apigee / PingAM',
        request: 'POST /authenticate',
        response: 'Evalua arbol',
      };
    }

    if (text.includes('redirectcallback')) {
      return {
        left: 'PingAM',
        right: 'Entra ID',
        request: 'RedirectCallback',
        response: 'SSO / error',
      };
    }

    if (text.includes('post resume') || text.includes('resume')) {
      return {
        left: 'Neo Angular',
        right: 'PingAM',
        request: 'POST authId',
        response: 'HttpCallback',
      };
    }

    if (text.includes('httpcallback') || text.includes('kerberos')) {
      return {
        left: 'Navegador',
        right: 'PingAM / Kerberos',
        request: 'POST + withCredentials',
        response: 'ticket / 401',
      };
    }

    if (text.includes('formulario')) {
      return {
        left: 'PingAM',
        right: 'Neo Angular',
        request: 'Name + Password callbacks',
        response: 'Muestra formulario',
      };
    }

    if (text.includes('credenciales')) {
      return {
        left: 'Neo Angular',
        right: 'PingAM',
        request: 'POST usuario/password',
        response: 'Valida credenciales',
      };
    }

    if (text.includes('autenticacion ok')) {
      return {
        left: 'PingAM',
        right: 'Neo Angular',
        request: 'Set-Cookie SSO',
        response: 'AUTH_SUCCESS',
      };
    }

    if (text.includes('authorize')) {
      return {
        left: 'Neo Angular',
        right: 'PingAM OAuth',
        request: 'GET /authorize',
        response: 'code + state',
      };
    }

    if (text.includes('token')) {
      return {
        left: 'Neo Angular',
        right: 'PingAM OAuth',
        request: 'POST /token',
        response: 'OIDC/OAuth tokens',
      };
    }

    return {
      left: 'Neo Angular',
      right: 'Back',
      request: 'Accion',
      response: 'Respuesta',
    };
  }
}
