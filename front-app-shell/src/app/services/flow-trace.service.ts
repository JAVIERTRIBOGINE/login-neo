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

    const diagram = this.createDiagram(step);
    this.logStepToConsole(step, diagram);

    this.updateSteps([
      ...this.stepsSubject.value.map((currentStep) => ({ ...currentStep, expanded: false })),
      {
        ...step,
        timestamp,
        diagram,
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

  collapseAll(): void {
    this.updateSteps(this.stepsSubject.value.map((step) => ({ ...step, expanded: false })));
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

    if (text.includes('adaptador acs local completado')) {
      return {
        left: 'Neo Angular',
        right: 'PingAM',
        leftFrame: 'Navegador',
        request: 'GET /SSORedirect',
        response: '200 payload ACS',
        requestFromFrame: true,
        responseToFrame: true,
        zone: 'saml',
        backendInfo: '1. Tras /token, Angular carga /saml/authorization-request.\n2. Ese componente formaliza /authnRequest contra NetScaler.\n3. NetScaler responde 302 Location a PingAM con SAMLRequest + RelayState.\n4. El navegador sigue /SSORedirect con SSO Cookie.\n5. PingAM responde 200 OK text/html al navegador: HTML con form autoenviado.\n6. Local: el form POST llega al adaptador ACS, que guarda SAMLResponse + RelayState y responde 303 a /saml/acs?responseId=...\n7. Angular ACS carga esa ruta y recupera el payload por responseId.\n\nFin de la intervencion del adaptador local:\n{ samlResponse, relayState }',
        sequence: {
          actors: ['Neo Angular', 'Navegador', 'NetScaler', 'PingAM', 'Adaptador ACS local'],
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
              detail: 'Respuesta al navegador: HTML con form autoenviado y campos SAMLResponse + RelayState',
            },
            {
              from: 1,
              to: 4,
              label: 'POST /saml/acs',
              detail: 'Local: recibe SAMLResponse + RelayState del form autoenviado; no es XHR',
            },
            {
              from: 4,
              to: 1,
              label: '303 See Other',
              detail: 'Location: /saml/acs?responseId=...; solo viaja el id, no la SAMLResponse',
            },
            {
              from: 1,
              to: 0,
              label: 'GET /saml/acs?responseId=...',
              detail: 'El navegador carga la ruta ACS de Angular',
            },
            {
              from: 0,
              to: 4,
              label: 'GET /saml/acs-response/{responseId}',
              detail: 'Solo local: Angular recupera SAMLResponse + RelayState por responseId',
            },
            {
              from: 4,
              to: 0,
              label: '200 payload ACS',
              detail: '{ samlResponse, relayState }',
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
        backendInfo: '1. Angular ya tiene SAMLResponse + RelayState.\n2. Angular crea un formulario POST hacia NetScaler.\n3. El navegador envia POST /validateSAMLResponse.\n4. NetScaler valida la asercion SAML, emite la Citrix Session Cookie y redirige a /saml/resources.\n\nbody form-urlencoded:\nSAMLResponse=<base64>\nRelayState=<relay>\n\nRespuesta esperada:\n302 Location: /saml/resources\nSet-Cookie: Citrix Session Cookie',
        sequence: {
          actors: ['Neo Angular', 'Navegador', 'NetScaler'],
          messages: [
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
        right: 'PingAM',
        leftFrame: 'Navegador',
        request: 'POST /authenticate {}',
        response: '200 RedirectCallback',
        zone: 'oauth',
        backendInfo: 'POST /authenticate\n\nbody: {}\nresponse: 200 OK\n{ authId, callbacks: [RedirectCallback] }',
      };
    }

    if (text.includes('post inicial')) {
      return {
        left: 'Neo Angular',
        right: 'Apigee / PingAM',
        leftFrame: 'Navegador',
        request: 'POST /authenticate',
        response: '200 RedirectCallback',
        zone: 'oauth',
        backendInfo: 'POST /authenticate\n\nbody: {}\nresponse: primer callback del arbol: RedirectCallback',
      };
    }

    if (text.includes('redirectcallback')) {
      return {
        left: 'Neo Angular',
        right: 'PingAM / Entra ID',
        leftFrame: 'Navegador',
        request: 'form GET redirectUrl',
        response: 'navegacion externa',
        requestFromFrame: true,
        responseToFrame: true,
        zone: 'oauth',
        backendInfo: '200 RedirectCallback\n\nAngular extrae output.redirectUrl y crea un form GET. El navegador abandona Angular hacia Entra ID/PingAM.',
        sequence: {
          actors: ['Neo Angular', 'Navegador', 'PingAM', 'Entra ID'],
          messages: [
            {
              from: 2,
              to: 0,
              label: '200 RedirectCallback',
              detail: 'authId + output.redirectUrl',
            },
            {
              from: 0,
              to: 1,
              label: 'form GET redirectUrl',
              detail: 'Angular no rellena el callback; usa redirectUrl',
            },
            {
              from: 1,
              to: 3,
              label: 'GET Entra ID /authorize',
              detail: 'El navegador sale del contexto Angular',
            },
          ],
        },
      };
    }

    if (text.includes('fallback transparente completo')) {
      return {
        left: 'Navegador',
        right: 'PingAM',
        leftFrame: 'Entra ID',
        request: 'GET Entra ID /authorize',
        response: '303 See Other',
        requestFromFrame: true,
        responseToFrame: true,
        zone: 'oauth',
        backendInfo: 'Navegacion externa tras RedirectCallback\n\nInicio: navegador llega a Entra ID/PingAM\nFin: PingAM responde 303 See Other\nLocation: /login?authId=...',
        sequence: {
          actors: ['Navegador', 'PingAM', 'Entra ID', 'Kerberos ADGBS.com', 'Kerberos Atenea'],
          messages: [
            { from: 0, to: 2, label: 'GET Entra ID /authorize', detail: 'El navegador llega a Entra ID/PingAM desde RedirectCallback' },
            { from: 2, to: 1, label: 'error /social/redirect', detail: 'Entra ID devuelve error a PingAM' },
            { from: 1, to: 3, label: 'validar Kerberos', detail: 'PingAM prueba ADGBS.com internamente' },
            { from: 3, to: 1, label: 'GSS/KRB error', detail: 'Ticket ausente, inválido o rechazado' },
            { from: 1, to: 4, label: 'validar Kerberos', detail: 'PingAM prueba Atenea internamente' },
            { from: 4, to: 1, label: 'GSS/KRB error', detail: 'Segundo dominio Kerberos rechazado' },
            { from: 1, to: 0, label: '303 See Other', detail: 'Location: /login?authId=...' },
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
        backendInfo: 'Entra ID\n\nresultado: error controlado\nsiguiente nodo: Kerberos interno en PingAM',
      };
    }

    if (text.includes('post resume') || text.includes('resume')) {
      return {
        left: 'Neo Angular',
        right: 'PingAM',
        leftFrame: 'Navegador',
        request: 'POST /authenticate { authId }',
        response: '200 callbacks',
        zone: 'oauth',
        backendInfo: 'El navegador ha vuelto a /login?authId=...\n\nAngular retoma el árbol:\nPOST /authenticate { authId }\nRespuesta esperada: NameCallback + PasswordCallback',
        sequence: {
          actors: ['Neo Angular', 'Navegador', 'PingAM'],
          messages: [
            {
              from: 2,
              to: 1,
              label: '303 See Other',
              detail: 'PingAM devuelve control al navegador',
            },
            {
              from: 1,
              to: 0,
              label: 'GET /login?authId=...',
              detail: 'Angular recupera control y lee authId',
            },
            {
              from: 0,
              to: 2,
              label: 'POST /authenticate { authId }',
              detail: 'XHR de reanudacion del arbol',
            },
            {
              from: 2,
              to: 0,
              label: '200 Name + Password',
              detail: 'Callback de credenciales',
            },
          ],
        },
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

    if (text.includes('autenticación ok') || text.includes('autenticacion ok')) {
      return {
        left: 'Neo Angular',
        right: 'PingAM',
        leftFrame: 'Navegador',
        request: 'POST /authenticate',
        response: '200 tokenId + SSO',
        responseToFrame: true,
        zone: 'oauth',
        backendInfo: 'POST /authenticate\n\nbody: { authId, NameCallback, PasswordCallback }\nresponse: 200 OK + tokenId\nSet-Cookie: SSO Cookie',
        sequence: {
          actors: ['Neo Angular', 'Navegador', 'PingAM'],
          messages: [
            {
              from: 0,
              to: 2,
              label: 'POST /authenticate',
              detail: 'body: authId + callbacks con usuario/password',
            },
            {
              from: 2,
              to: 0,
              label: '200 OK tokenId',
              detail: 'Set-Cookie SSO; Angular recibe AUTH_SUCCESS',
            },
          ],
        },
      };
    }

    if (text.includes('authorize')) {
      return {
        left: 'Neo Angular',
        right: 'PingAM',
        leftFrame: 'Navegador',
        request: 'POST /authorize',
        response: '302 /token',
        requestFromFrame: true,
        responseToFrame: true,
        zone: 'oauth',
        backendInfo: 'form POST /authorize\n\nparams: client_id, redirect_uri, response_type=code, scope, state, code_challenge, csrf/assertion=tokenId\nRespuesta: 302 Found\nLocation: /token?code=...&state=...',
        sequence: {
          actors: ['Neo Angular', 'Navegador', 'PingAM'],
          messages: [
            {
              from: 0,
              to: 1,
              label: 'form POST /authorize',
              detail: 'Angular crea formulario con params OAuth; no authId',
            },
            {
              from: 1,
              to: 2,
              label: 'POST /authorize',
              detail: 'El navegador envia params + csrf/assertion=tokenId',
            },
            {
              from: 2,
              to: 1,
              label: '302 Found',
              detail: 'Location: /token?code=...&state=...',
            },
            {
              from: 1,
              to: 0,
              label: 'GET /token?code=...&state=...',
              detail: 'El navegador carga la ruta Angular de tokens',
            },
          ],
        },
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

    if (text.includes('token')) {
      return {
        left: 'Neo Angular',
        right: 'PingAM OAuth',
        leftFrame: 'Navegador',
        request: 'POST /token',
        response: '200 OIDC/OAuth tokens',
        zone: 'oauth',
        backendInfo: 'POST /token\n\nbody: code, state, clientId, redirectUri\nSSO/tokenId: token_sso\nresponse: id_token + access_token',
        sequence: {
          actors: ['Neo Angular', 'Navegador', 'PingAM'],
          messages: [
            {
              from: 0,
              to: 2,
              label: 'POST /token',
              detail: 'TokensComponent envia code/state + clientId/redirectUri',
            },
            {
              from: 2,
              to: 0,
              label: '200 OK tokens',
              detail: 'id_token + access_token; Angular guarda OIDC/OAuth',
            },
          ],
        },
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

  private logStepToConsole(
    step: Pick<FlowTraceStep, 'title' | 'description'>,
    diagram: FlowTraceDiagram
  ): void {
    const logger = console as Console & { groupCollapsed?: (...data: unknown[]) => void; groupEnd?: () => void };
    logger.groupCollapsed?.(`[NEO flow] ${step.title}`);
    console.log(step.description);
    if (diagram.backendInfo) console.log(diagram.backendInfo);
    if (diagram.sequence) console.log('sequence', diagram.sequence);
    logger.groupEnd?.();
  }
}
