import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface FlowTraceStep {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  diagram: FlowTraceDiagram;
  completed: boolean;
  expanded: boolean;
}

export interface FlowTraceDiagram {
  left: string;
  right: string;
  request: string;
  response: string;
  leftFrame?: string;
  requestFromFrame?: boolean;
  responseToFrame?: boolean;
  redirectTarget?: string;
  redirect?: string;
  zone?: 'saml' | 'oauth';
  backendInfo?: string;
  sequence?: FlowTraceSequence;
}

export interface FlowTraceSequence {
  actors: string[];
  messages: FlowTraceSequenceMessage[];
}

export interface FlowTraceSequenceMessage {
  from: number;
  to: number;
  label: string;
  detail?: string;
}

export const NEO_FLOW_STEP_EVENT = 'neoFlowStep';
export const NEO_FLOW_STEP_NEXT_EVENT = 'neoFlowStepNext';
const FLOW_TRACE_STORAGE_KEY = 'neo.flowTrace.steps';

@Injectable({ providedIn: 'root' })
export class FlowTraceService {
  private readonly stepsSubject = new BehaviorSubject<FlowTraceStep[]>(this.restoreSteps());

  readonly steps$ = this.stepsSubject.asObservable();

  get currentSteps(): FlowTraceStep[] {
    return this.stepsSubject.value;
  }

  addStep(step: Pick<FlowTraceStep, 'id' | 'title' | 'description'>): void {
    /*
     * El panel lateral es acumulativo: cada evento que llega desde login/SAML se
     * conserva en memoria para que la demo muestre el historico completo del flujo.
     */
    const timestamp = new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date());

    this.updateSteps([
      ...this.stepsSubject.value.map((currentStep) => ({ ...currentStep, expanded: false })),
      {
        ...step,
        timestamp,
        diagram: this.createDiagram(step),
        completed: false,
        expanded: true,
      },
    ]);
  }

  completeStep(id: string): void {
    this.updateSteps(
      this.stepsSubject.value.map((step) => (step.id === id ? { ...step, completed: true, expanded: false } : step))
    );
  }

  toggleStep(id: string): void {
    this.updateSteps(
      this.stepsSubject.value.map((step) => (step.id === id ? { ...step, expanded: !step.expanded } : step))
    );
  }

  clear(): void {
    this.updateSteps([]);
    try {
      window.sessionStorage.removeItem(FLOW_TRACE_STORAGE_KEY);
    } catch {
      // La traza visual no debe bloquear el flujo si el storage está deshabilitado.
    }
  }

  private updateSteps(steps: FlowTraceStep[]): void {
    this.stepsSubject.next(steps);
    try {
      window.sessionStorage.setItem(FLOW_TRACE_STORAGE_KEY, JSON.stringify(steps));
    } catch {
      // La persistencia es auxiliar; el diagrama sigue funcionando en memoria.
    }
  }

  private restoreSteps(): FlowTraceStep[] {
    try {
      const stored = window.sessionStorage.getItem(FLOW_TRACE_STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((step): step is FlowTraceStep => this.isStoredStep(step));
    } catch {
      return [];
    }
  }

  private isStoredStep(step: unknown): step is FlowTraceStep {
    if (!step || typeof step !== 'object') return false;
    const candidate = step as Partial<FlowTraceStep>;
    return typeof candidate.id === 'string'
      && typeof candidate.title === 'string'
      && typeof candidate.description === 'string'
      && typeof candidate.timestamp === 'string'
      && typeof candidate.completed === 'boolean'
      && typeof candidate.expanded === 'boolean'
      && Boolean(candidate.diagram && typeof candidate.diagram === 'object');
  }

  private createDiagram(step: Pick<FlowTraceStep, 'title' | 'description'>): FlowTraceDiagram {
    /*
     * Mapper pragmatico para la POC: a partir del titulo/descripcion del step se
     * decide que actores y flechas pintar. No gobierna el flujo real; solo traduce
     * eventos funcionales a una representacion visual tipo diagrama secuencial.
     */
    const text = `${step.title} ${step.description}`.toLowerCase();

    if (text.includes('401 resources')) {
      return {
        left: 'Neo Angular',
        right: 'NetScaler',
        leftFrame: 'Navegador',
        request: 'GET /resources',
        response: '401 Unauthorized',
        zone: 'saml',
        backendInfo: 'GET /resources\n\nstatus: 401 Unauthorized\naccion: AUTHN_REQUEST',
      };
    }

    if (text.includes('authnrequest y redirección pingam')) {
      return {
        left: 'Neo Angular',
        leftFrame: 'Navegador',
        right: 'NetScaler',
        redirectTarget: 'PingAM',
        request: 'GET /authnRequest',
        response: '302 Location: PingAM',
        redirect: 'GET /SSORedirect',
        responseToFrame: true,
        zone: 'saml',
        backendInfo: '1. Angular inicia GET /authnRequest → NetScaler\n2. 302 Location: PingAM /SSORedirect → navegador\n3. El navegador sigue el redirect automáticamente',
      };
    }

    if (text.includes('sso unauthorized en pingam')) {
      return {
        left: 'Neo Angular',
        leftFrame: 'Navegador',
        right: 'Apigee / PingAM',
        request: 'GET /SSORedirect',
        response: '303 See Other',
        requestFromFrame: true,
        zone: 'oauth',
        backendInfo: 'GET /SSORedirect\n\nSSO Cookie: ausente o expirada\nResultado: SSO Unauthorized\nRespuesta: 303 See Other\nLocation: /login?samlSso=unauthorized\n\nEl navegador sigue el Location y carga Angular en /login.',
        sequence: {
          actors: ['Neo Angular', 'Navegador', 'Apigee / PingAM'],
          messages: [
            {
              from: 1,
              to: 2,
              label: 'GET /SSORedirect',
              detail: 'El navegador llega a PingAM siguiendo el 302 de NetScaler',
            },
            {
              from: 2,
              to: 1,
              label: '303 See Other',
              detail: 'Location: /login?samlSso=unauthorized',
            },
            {
              from: 1,
              to: 0,
              label: 'GET /login?samlSso=unauthorized',
              detail: 'El navegador carga la ruta Angular que inicia OAuth',
            },
          ],
        },
      };
    }

    if (text.includes('validatesamlresponse')) {
      return {
        left: 'Neo Angular',
        right: 'NetScaler',
        leftFrame: 'Navegador',
        request: 'POST /validateSAMLResponse',
        response: '302 /saml/resources',
        requestFromFrame: true,
        responseToFrame: true,
        zone: 'saml',
        backendInfo: '1. Tras /token, Angular carga /saml/authorization-request.\n2. Ese componente formaliza /authnRequest contra NetScaler.\n3. NetScaler responde 302 Location a PingAM con SAMLRequest + RelayState.\n4. El navegador sigue /SSORedirect con SSO Cookie.\n5. PingAM responde 200 OK text/html con form autoenviado a ACS NEO.\n6. Angular recupera SAMLResponse + RelayState.\n7. Navegador envia POST /validateSAMLResponse.\n\nbody form-urlencoded:\nSAMLResponse=<base64>\nRelayState=<relay>\n\nRespuesta esperada:\n302 Location: /saml/resources\nSet-Cookie: Citrix Session Cookie',
        sequence: {
          actors: ['Neo Angular', 'Navegador', 'NetScaler', 'PingAM', 'ACS NEO / adaptador local'],
          messages: [
            {
              from: 0,
              to: 1,
              label: 'location /authnRequest',
              detail: 'Tras /token, Angular carga /saml/authorization-request',
            },
            {
              from: 1,
              to: 2,
              label: 'GET /authnRequest',
              detail: 'No XHR. NetScaler crea SAMLRequest + RelayState',
            },
            {
              from: 2,
              to: 1,
              label: '302 Found',
              detail: 'Location: /SSORedirect?SAMLRequest=...&RelayState=...',
            },
            {
              from: 1,
              to: 3,
              label: 'GET /SSORedirect',
              detail: 'El navegador sigue el Location y adjunta la SSO Cookie de PingAM',
            },
            {
              from: 3,
              to: 1,
              label: '200 OK text/html',
              detail: 'HTML con form autoenviado y campos SAMLResponse + RelayState',
            },
            {
              from: 1,
              to: 4,
              label: 'POST ACS NEO',
              detail: 'ACS URL registrada en PingAM; formulario autoenviado, no XHR',
            },
            {
              from: 4,
              to: 1,
              label: '303 See Other',
              detail: 'Local: el adaptador redirige a Angular con responseId',
            },
            {
              from: 1,
              to: 0,
              label: 'GET /saml/acs',
              detail: 'El navegador carga la ruta ACS de Angular',
            },
            {
              from: 0,
              to: 4,
              label: 'GET acs-response',
              detail: 'Solo local: Angular recupera SAMLResponse + RelayState por responseId',
            },
            {
              from: 4,
              to: 0,
              label: '200 payload ACS',
              detail: '{ samlResponse, relayState }',
            },
            {
              from: 0,
              to: 1,
              label: 'form POST SAMLResponse',
              detail: 'Angular crea el formulario hacia NetScaler',
            },
            {
              from: 1,
              to: 2,
              label: 'POST /validateSAMLResponse',
              detail: 'Navegacion de formulario; no es XHR',
            },
            {
              from: 2,
              to: 1,
              label: '302 Found',
              detail: 'Set-Cookie Citrix + Location: /saml/resources',
            },
            {
              from: 1,
              to: 0,
              label: 'GET /saml/resources',
              detail: 'El navegador devuelve el control al MFE SAML',
            },
          ],
        },
      };
    }

    if (text.includes('resources ok')) {
      return {
        left: 'Neo Angular',
        right: 'NetScaler',
        leftFrame: 'Navegador',
        request: 'GET /resources',
        response: '200 OK recursos',
        zone: 'saml',
        backendInfo: 'GET /resources\n\nstatus: 200 OK\npayload: { resources: [...] }',
      };
    }

    if (text.includes('oauth: inicio')) {
      return {
        left: 'Neo Angular',
        right: 'Zona OAuth',
        leftFrame: 'Navegador',
        request: 'Inicia flujo',
        response: 'Prepara authorize tree',
        zone: 'oauth',
      };
    }

    if (text.includes('post inicial')) {
      return {
        left: 'Neo Angular',
        right: 'Apigee / PingAM',
        leftFrame: 'Navegador',
        request: 'POST /authenticate',
        response: 'Evalua arbol',
        zone: 'oauth',
        backendInfo: 'POST /authenticate\n\nbody: <empty>\nresponse: primer callback del arbol',
      };
    }

    if (text.includes('redirectcallback')) {
      return {
        left: 'Neo Angular',
        right: 'Entra ID',
        leftFrame: 'Navegador',
        request: 'RedirectCallback',
        response: 'SSO / error',
        requestFromFrame: true,
        responseToFrame: true,
        zone: 'oauth',
        backendInfo: 'RedirectCallback\n\nobjetivo: Entra ID\nfallback: continuar arbol PingAM',
      };
    }

    if (text.includes('fallback transparente completo')) {
      return {
        left: 'Neo Angular',
        right: 'PingAM',
        leftFrame: 'Navegador',
        request: 'Árbol transparente',
        response: '200 callbacks',
        zone: 'oauth',
        backendInfo: 'PingAM resuelve internamente Entra ID y Kerberos.\n\nResultado final para Angular:\nHTTP 200 OK\nNameCallback + PasswordCallback',
        sequence: {
          actors: ['Neo Angular', 'Navegador', 'PingAM', 'Entra ID', 'Kerberos ADGBS.com', 'Kerberos Atenea'],
          messages: [
            { from: 0, to: 2, label: 'POST /authentication {}', detail: 'XHR inicial del árbol OAuth' },
            { from: 2, to: 0, label: '200 RedirectCallback', detail: 'PingAM devuelve redirectUrl hacia Entra ID' },
            { from: 0, to: 1, label: 'form GET redirectUrl', detail: 'Angular crea el formulario y el navegador toma el control' },
            { from: 1, to: 3, label: 'GET /authorize', detail: 'Navegación hacia Entra ID' },
            { from: 3, to: 2, label: 'error /social/redirect', detail: 'Entra ID devuelve error a PingAM' },
            { from: 2, to: 4, label: 'validar Kerberos', detail: 'PingAM prueba ADGBS.com internamente' },
            { from: 4, to: 2, label: 'GSS/KRB error', detail: 'Ticket ausente, inválido o rechazado' },
            { from: 2, to: 5, label: 'validar Kerberos', detail: 'PingAM prueba Atenea internamente' },
            { from: 5, to: 2, label: 'GSS/KRB error', detail: 'Segundo dominio Kerberos rechazado' },
            { from: 2, to: 0, label: '200 Name + Password', detail: 'PingAM cae a credenciales y Angular pinta formulario' },
          ],
        },
      };
    }

    if (text.includes('entra id error')) {
      return {
        left: 'Neo Angular',
        right: 'Entra ID',
        leftFrame: 'Navegador',
        request: 'GET RedirectCallback',
        response: 'error federacion',
        requestFromFrame: true,
        responseToFrame: true,
        zone: 'oauth',
        backendInfo: 'Entra ID\n\nresultado: error controlado\nsiguiente nodo: Kerberos / HttpCallback',
      };
    }

    if (text.includes('post resume') || text.includes('resume')) {
      return {
        left: 'Neo Angular',
        right: 'PingAM',
        leftFrame: 'Navegador',
        request: 'POST authId',
        response: 'HttpCallback',
        zone: 'oauth',
        backendInfo: 'POST /authenticate\n\nbody: { authId, callbacks }\nresponse: HttpCallback / siguiente nodo',
      };
    }

    if (text.includes('httpcallback') || text.includes('kerberos')) {
      return {
        left: 'Neo Angular',
        right: 'PingAM / Kerberos',
        leftFrame: 'Navegador',
        request: 'POST + withCredentials',
        response: 'ticket / 401',
        requestFromFrame: true,
        responseToFrame: true,
        zone: 'oauth',
        backendInfo: 'POST Kerberos\n\ncredentials: include\nfallback: formulario usuario/password',
      };
    }

    if (text.includes('formulario')) {
      return {
        left: 'Neo Angular',
        right: 'PingAM',
        leftFrame: 'Navegador',
        request: 'Name + Password callbacks',
        response: 'Muestra formulario',
        responseToFrame: true,
        zone: 'oauth',
        backendInfo: 'Callbacks PingAM\n\nNameCallback\nPasswordCallback\naccion: pintar formulario',
      };
    }

    if (text.includes('credenciales')) {
      return {
        left: 'Neo Angular',
        right: 'PingAM',
        leftFrame: 'Navegador',
        request: 'POST usuario/password',
        response: 'Valida credenciales',
        zone: 'oauth',
        backendInfo: 'POST /authenticate\n\nbody: { user, password, authId }\nresponse: tokenId mock',
      };
    }

    if (text.includes('autenticacion ok')) {
      return {
        left: 'Neo Angular',
        right: 'PingAM',
        leftFrame: 'Navegador',
        request: 'Set-Cookie SSO',
        response: 'AUTH_SUCCESS',
        responseToFrame: true,
        zone: 'oauth',
        backendInfo: 'AUTH_SUCCESS\n\nsuccessUrl: /dashboard\ntokenId: mock-token\nrealm: /',
      };
    }

    if (text.includes('authorize')) {
      return {
        left: 'Neo Angular',
        right: 'PingAM OAuth',
        leftFrame: 'Navegador',
        request: 'GET /authorize',
        response: 'code + state',
        requestFromFrame: true,
        responseToFrame: true,
        zone: 'oauth',
        backendInfo: 'POST /authorize\n\nparams: clientId, redirectUri, csrf\nresponse: code + state',
      };
    }

    if (text.includes('token')) {
      return {
        left: 'Neo Angular',
        right: 'PingAM OAuth',
        leftFrame: 'Navegador',
        request: 'POST /token',
        response: 'OIDC/OAuth tokens',
        zone: 'oauth',
        backendInfo: 'POST /token\n\nbody: authorization_code\nresponse: id_token + access_token',
      };
    }

    return {
      left: 'Neo Angular',
      right: 'Back',
      leftFrame: 'Navegador',
      request: 'Accion',
      response: 'Respuesta',
    };
  }
}
