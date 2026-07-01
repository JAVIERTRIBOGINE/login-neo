import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA, Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';

import {
  FlowTraceService,
  FlowTraceStep,
  NEO_FLOW_STEP_EVENT,
  NEO_FLOW_STEP_NEXT_EVENT,
} from '../../services/flow-trace.service';
import { ResourcesService } from '../../services/resources.service';

declare global {
  interface Window {
    NEO_SHELL?: boolean;
  }
}

@Component({
  selector: 'neo-shell-root',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf, RouterOutlet],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './shell-layout.component.html',
  styleUrl: './shell-layout.component.scss',
})
export class ShellLayoutComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly resources = inject(ResourcesService);
  private readonly flowTrace = inject(FlowTraceService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly subscriptions = new Subscription();

  readonly menu$ = this.resources.menu$;
  readonly flowSteps$ = this.flowTrace.steps$;
  ssoCookieEnabled = false;
  citrixCookieEnabled = false;
  flowPanelWidth = 520;
  codeModal: { title: string; snippets: FlowCodeSnippet[] } | null = null;

  private readonly minFlowPanelWidth = 420;
  private readonly minMainContentWidth = 180;
  private readonly fixedShellColumnsWidth = 210;
  private isResizingFlowPanel = false;

  ngOnInit(): void {
    /*
     * Marcador global de POC: el MFE login lo usa para saber que esta embebido
     * en la shell NEO. En ese modo no abre modales bloqueantes; publica steps al
     * panel lateral y espera al boton "Siguiente".
     */
    window.NEO_SHELL = true;
    window.addEventListener('proteoEventBusPublish', this.handleProteoEvent);
    window.addEventListener(NEO_FLOW_STEP_EVENT, this.handleFlowStepEvent);
    this.restoreCookieIndicatorsFromTrace();
  }

  ngOnDestroy(): void {
    window.removeEventListener('proteoEventBusPublish', this.handleProteoEvent);
    window.removeEventListener(NEO_FLOW_STEP_EVENT, this.handleFlowStepEvent);
    delete window.NEO_SHELL;
    document.body.classList.remove('shell-flow-resizing');
    this.subscriptions.unsubscribe();
  }

  collapseFlowTrace(): void {
    this.flowTrace.collapseAll();
    this.changeDetector.markForCheck();
  }

  nextFlowStep(step: FlowTraceStep): void {
    this.flowTrace.completeStep(step.id);
    /*
     * El click en "Siguiente" desbloquea la Promise que el MFE login dejo
     * pendiente. Asi la demo enseña cada salto backend sin tapar la UI central.
     */
    window.dispatchEvent(new CustomEvent(NEO_FLOW_STEP_NEXT_EVENT, { detail: { id: step.id } }));
  }

  toggleFlowStep(step: FlowTraceStep): void {
    this.flowTrace.toggleStep(step.id);
  }

  hasActiveFlowStep(steps: FlowTraceStep[]): boolean {
    return steps.some((step) => !step.completed);
  }

  startFlowPanelResize(event: MouseEvent): void {
    event.preventDefault();
    this.isResizingFlowPanel = true;
    document.body.classList.add('shell-flow-resizing');
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    if (!this.isResizingFlowPanel) return;
    const width = window.innerWidth - event.clientX;
    const maxFlowPanelWidth = Math.max(
      this.minFlowPanelWidth,
      window.innerWidth - this.fixedShellColumnsWidth - this.minMainContentWidth
    );
    this.flowPanelWidth = Math.min(maxFlowPanelWidth, Math.max(this.minFlowPanelWidth, width));
  }

  @HostListener('document:mouseup')
  onDocumentMouseUp(): void {
    if (!this.isResizingFlowPanel) return;
    this.isResizingFlowPanel = false;
    document.body.classList.remove('shell-flow-resizing');
  }

  navigate(label: string): void {
    const routeByLabel: Record<string, string> = {
      workspace: '/workspace',
      aplicaciones: '/aplicaciones',
      escritorios: '/escritorios',
    };
    const route = routeByLabel[this.normalizeLabel(label)] ?? '/';
    void this.router.navigate([route]);
  }

  openCodeModal(source: FlowCodeSource, steps: FlowTraceStep[]): void {
    const step = this.getCodeContextStep(steps);
    const snippets = step ? this.getCodeSnippets(step, source, steps) : [];
    this.codeModal = {
      title: source === 'micro' ? 'Código micro front' : 'Código auth-manager',
      snippets,
    };
  }

  closeCodeModal(): void {
    this.codeModal = null;
  }

  hasCodeSnippets(source: FlowCodeSource, steps: FlowTraceStep[]): boolean {
    const step = this.getCodeContextStep(steps);
    return Boolean(step && this.getCodeSnippets(step, source, steps).length);
  }

  highlightCode(code: string): FlowCodeToken[][] {
    return code.split('\n').map((line) => this.highlightCodeLine(line));
  }

  @HostListener('document:keydown.escape')
  onDocumentEscape(): void {
    this.closeCodeModal();
  }

  private readonly handleProteoEvent = (event: Event): void => {
    const detail = (event as CustomEvent<{ topic?: string; detail?: unknown }>).detail;
    const topic = detail?.topic ?? '';

    if (topic.includes('AUTHN_REQUEST')) {
      /*
       * NetScaler/resources devuelve 401: se limpia el menú, pero la navegación
       * continúa en el MFE SAML hacia /authnRequest. Solo PingAM puede decidir,
       * al comprobar su cookie SSO, si es necesario derivar al flujo OAuth.
       */
      this.resources.clearMenu();
      return;
    }

    if (topic.includes('TOKENS_OK')) {
      this.ssoCookieEnabled = true;
      this.changeDetector.markForCheck();
      return;
    }

    if (topic.includes('SAML_MANAGER:SUCCESS')) {
      /*
       * Cuando el MFE SAML publica exito, la shell toma el payload resources,
       * construye el menu izquierdo y aterriza directamente en Workspace.
       */
      this.citrixCookieEnabled = true;
      this.resources.setMenuFromResponse(detail.detail);
      void this.router.navigate(['/workspace']);
      this.changeDetector.markForCheck();
    }
  };

  private readonly handleFlowStepEvent = (event: Event): void => {
    const detail = (event as CustomEvent<{ id?: string; title?: string; description?: string }>).detail;
    if (!detail?.id || !detail.title || !detail.description) return;
    if (this.shouldAutoResolveRepeatedSamlStep(detail.title)) {
      window.dispatchEvent(new CustomEvent(NEO_FLOW_STEP_NEXT_EVENT, { detail: { id: detail.id } }));
      return;
    }
    /*
     * Canal visual de POC: cualquier proyecto puede emitir neoFlowStep y la shell
     * lo transforma en tarjeta acumulada con descripcion y diagrama secuencial.
     */
    this.updateCookieIndicatorsFromStep(detail.title, detail.description);
    this.flowTrace.addStep({
      id: detail.id,
      title: detail.title,
      description: detail.description,
    });
  };

  private shouldAutoResolveRepeatedSamlStep(title: string): boolean {
    const normalizedTitle = title.toLowerCase();
    const isRepeatedSamlEntryStep = normalizedTitle.includes('401 resources');

    if (!isRepeatedSamlEntryStep) return false;

    const previousSteps = this.flowTrace.currentSteps;
    const oauthAlreadyCompleted = previousSteps.some((step) => {
      const text = `${step.title} ${step.description}`.toLowerCase();
      return text.includes('autenticación ok')
        || text.includes('autenticacion ok')
        || text.includes('tokens')
        || text.includes('auth_success');
    });
    const sameStepAlreadyShown = previousSteps.some((step) => step.title.toLowerCase() === normalizedTitle);

    return oauthAlreadyCompleted && sameStepAlreadyShown;
  }

  private normalizeLabel(label: string): string {
    return label
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private updateCookieIndicatorsFromStep(title: string, description: string): void {
    const text = `${title} ${description}`.toLowerCase();
    if (
      text.includes('autenticación ok')
      || text.includes('autenticacion ok')
      || text.includes('set-cookie sso')
      || text.includes('auth_success')
    ) {
      this.ssoCookieEnabled = true;
    }

    if (
      text.includes('set-cookie citrix')
      || text.includes('saml_success')
      || text.includes('resources ok')
      || text.includes('200 ok recursos')
    ) {
      this.citrixCookieEnabled = true;
    }

    this.changeDetector.markForCheck();
  }

  private restoreCookieIndicatorsFromTrace(): void {
    const text = this.flowTrace.currentSteps
      .map((step) => `${step.title} ${step.description}`)
      .join(' ')
      .toLowerCase();

    this.ssoCookieEnabled = text.includes('autenticación ok')
      || text.includes('autenticacion ok')
      || text.includes('tokens')
      || text.includes('auth_success');
    this.citrixCookieEnabled = text.includes('saml_success')
      || text.includes('resources ok')
      || text.includes('200 ok recursos')
      || text.includes('set-cookie citrix');
  }

  private getCodeContextStep(steps: FlowTraceStep[]): FlowTraceStep | null {
    const expandedSteps = steps.filter((step) => step.expanded);
    return expandedSteps.length === 1 ? expandedSteps[0] : null;
  }

  private getCodeSnippets(step: FlowTraceStep, source: FlowCodeSource, steps: FlowTraceStep[]): FlowCodeSnippet[] {
    const text = `${step.title} ${step.description}`.toLowerCase();
    if (text.includes('401 resources')) return this.getResources401CodeSnippets(source);
    if (text.includes('authnrequest y redirección pingam')) {
      return this.isPostTokenAuthnRequest(step, steps)
        ? this.getPostTokenAuthnRequestCodeSnippets(source)
        : this.getAuthnRequestCodeSnippets(source);
    }
    if (text.includes('sso unauthorized en pingam')) return this.getSsoUnauthorizedCodeSnippets(source);
    if (text.includes('oauth: inicio')) return this.getOauthStartCodeSnippets(source);
    if (text.includes('redirectcallback')) return this.getRedirectCallbackCodeSnippets(source);
    if (text.includes('paso oauth: resume')) return this.getOauthResumeCodeSnippets(source);
    if (text.includes('oauth') && text.includes('formulario')) return this.getCredentialsFormCodeSnippets(source);
    if (text.includes('authorize redirect')) return this.getAuthorizeRedirectCodeSnippets(source);
    if (text.includes('oauth') && text.includes('credenciales')) return this.getCredentialsSubmitCodeSnippets(source);
    if (text.includes('fallback transparente completo')) return [];
    if (text.includes('token request')) return this.getTokenRequestCodeSnippets(source);
    if (text.includes('autenticación ok') || text.includes('autenticacion ok')) return this.getOauthSuccessCodeSnippets(source);
    return [];
  }

  private isPostTokenAuthnRequest(step: FlowTraceStep, steps: FlowTraceStep[]): boolean {
    const stepIndex = steps.findIndex((candidate) => candidate.id === step.id);
    if (stepIndex <= 0) return false;

    return steps.slice(0, stepIndex).some((previousStep) => {
      const previousText = `${previousStep.title} ${previousStep.description}`.toLowerCase();
      return previousText.includes('token request');
    });
  }

  private getResources401CodeSnippets(source: FlowCodeSource): FlowCodeSnippet[] {
    if (source === 'micro') {
      return [
        {
          description: 'Entrada del micro SAML: configura el manager, lanza la comprobacion de recursos y reacciona al 401 navegando al inicio de AuthnRequest.',
          file: 'front-app-login/src/app/saml-flow/presentation/pages/resources/resources.component.ts',
          startLine: 37,
          endLine: 61,
          language: 'typescript',
          code: `async ngOnInit(): Promise<void> {
  this.samlSub = this.samlManager.events$.subscribe(event => this.handleEvent(event));
  const shellConfig = await this.runtimeConfig.whenReady();
  this.config = buildSamlManagerConfig(shellConfig);
  this.samlManager.setConfig({
    ...this.config,
    confirmStep: step => this.flowConfirmation.confirm(step),
  });
  this.samlManager.checkResources(); // cubre llamadas 1 (primera vez) y 6 (retorno tras NetScaler)
}

private handleEvent(event: SamlManagerEvent): void {
  switch (event.type) {
    case SAML_MANAGER_EVENTS.SAML_SUCCESS:
      // saml:success ya publicado por SamlManagerService — fin del flujo
      this.loading.set(false);
      this.oauthManager.completeSamlAuthorization(event.payload);
      break;
    case SAML_MANAGER_EVENTS.AUTHN_REQUEST:
      this.oauthManager.requireSamlAuthorization({
        authnRequestUrl: this.config.endpoints.authnRequest,
        method: this.config.authnRequestMethod,
      });
      this.router.navigate([SAML_ROUTE_DATA.AUTHORIZATION_REQUEST]);
      break;`,
        },
      ];
    }

    return [
      {
        description: 'El manager SAML ejecuta la llamada real a /resources; si llega un 401, publica AUTHN_REQUEST para que el micro inicie el flujo SAML.',
        file: 'front-core-atlas/src/angular/packages/auth-manager/src/lib/saml-manager.service.ts',
        startLine: 26,
        endLine: 58,
        language: 'typescript',
        code: `checkResources(): void {
  this.http.get(this.config.endpoints.resources, { withCredentials: true }).pipe(
    timeout(10000)
  ).subscribe({
    next: response => void this.handleSuccess(response),
    error: error => void this.handleError(error as HttpErrorResponse | Error),
  });
}

private async handleSuccess(response: unknown): Promise<void> {
  await this.confirm({
    title: 'Paso SAML: resources OK',
    description: \`GET \${this.config.endpoints.resources} ha respondido 200 OK.\`,
  });
  this.publish({ type: SAML_MANAGER_EVENTS.SAML_SUCCESS, payload: response });
}

private async handleError(error: HttpErrorResponse | Error): Promise<void> {
  if (error instanceof HttpErrorResponse && error.status === 401) {
    await this.confirm({
      title: 'Paso SAML: 401 resources',
      description: \`GET \${this.config.endpoints.resources} ha respondido 401. Se inicia SAML SP-Initiated.\`,
    });
    this.publish({ type: SAML_MANAGER_EVENTS.AUTHN_REQUEST });
    return;
  }`,
      },
    ];
  }

  private getAuthnRequestCodeSnippets(source: FlowCodeSource): FlowCodeSnippet[] {
    if (source === 'micro') {
      return [
        {
          description: 'Esta porcion abandona el contexto Angular para invocar /authnRequest por GET mediante navegacion del navegador.',
          file: 'front-app-login/src/app/saml-flow/presentation/shared/redirect-handler.component.ts',
          startLine: 19,
          endLine: 26,
          language: 'typescript',
          code: `ngOnInit(): void {
  /*
   * Si Citrix/back confirma POST para /authnRequest:
   * - opcion corta: cambiar AUTHN_REQUEST_METHOD a POST y enviar un form vacio autoenviado.
   * - opcion larga: anadir params configurables si /authnRequest exige campos hidden.
   */
  if (this.method === 'GET') window.location.assign(this.url);
}`,
        },
        {
          description: 'El micro recibe el evento AUTHN_REQUEST, pasa el contexto al OauthManager y navega a la ruta que contiene el RedirectHandler.',
          file: 'front-app-login/src/app/saml-flow/presentation/pages/resources/resources.component.ts',
          startLine: 55,
          endLine: 61,
          language: 'typescript',
          code: `case SAML_MANAGER_EVENTS.AUTHN_REQUEST:
  this.oauthManager.requireSamlAuthorization({
    authnRequestUrl: this.config.endpoints.authnRequest,
    method: this.config.authnRequestMethod,
  });
  this.router.navigate([SAML_ROUTE_DATA.AUTHORIZATION_REQUEST]);
  break;`,
        },
      ];
    }

    return [
      {
        description: 'OauthManager conserva el contexto SAML como evento de coordinacion para que shell/micro conozcan la necesidad de AuthnRequest.',
        file: 'front-core-atlas/src/angular/packages/auth-manager/src/lib/oauth-manager.service.ts',
        startLine: 66,
        endLine: 72,
        language: 'typescript',
        code: `/** Coordina la transición de sesión Citrix ausente hacia el flujo SAML SP-Initiated. */
requireSamlAuthorization(context: SamlAuthorizationContext): void {
  this.publish({
    type: OAUTH_MANAGER_EVENTS.SAML_AUTHORIZATION_REQUIRED,
    payload: context,
  });
}`,
      },
      {
        description: 'publish duplica la notificacion: stream interno del servicio y EventBus global de Proteo para consumidores externos.',
        file: 'front-core-atlas/src/angular/packages/auth-manager/src/lib/oauth-manager.service.ts',
        startLine: 414,
        endLine: 417,
        language: 'typescript',
        code: `private publish(event: OauthManagerEvent): void {
  this.eventSubject.next(event);
  EventManager.getInstance().publish(event.type, event.payload);
}`,
      },
    ];
  }

  private getPostTokenAuthnRequestCodeSnippets(source: FlowCodeSource): FlowCodeSnippet[] {
    if (source !== 'micro') return [];

    return [
      {
        description: 'Tras obtener y guardar OIDC/OAuth, el micro vuelve al flujo SAML navegando a la ruta que dispara una nueva AuthnRequest.',
        file: 'front-app-login/src/app/login/presentation/pages/get-tokens/get-tokens.component.ts',
        startLine: 101,
        endLine: 110,
        language: 'typescript',
        code: `/*
 * Los tokens se registran en data-manager para que el resto de la solucion
 * global pueda consumirlos. Despues se rellama a /authnRequest para que
 * NetScaler emita una SAMLRequest nueva y redirija a PingAM.
 */
setAuthorization({OIDC: this.authorizeResponse.id_token, OAUTH: this.authorizeResponse.access_token} as AuthorizationTokens)
this.publishService.publishOauthEvent(LOGIN_EVENTS.TOKENS)
this.processing.set(false);
await this.samlRuntimeConfig.whenReady();
void this.router.navigate([SAML_ROUTE_DATA.AUTHORIZATION_REQUEST]);`,
      },
      {
        description: 'La ruta /saml/authorization-request resuelve la configuracion SAML, confirma el step y entrega url/metodo al RedirectHandler.',
        file: 'front-app-login/src/app/saml-flow/presentation/pages/get-authorization-request/get-authorization-request.component.ts',
        startLine: 28,
        endLine: 35,
        language: 'typescript',
        code: `async ngOnInit(): Promise<void> {
  const config = buildSamlManagerConfig(await this.runtimeConfig.whenReady());
  await this.flowConfirmation.confirm({
    title: 'Paso SAML: authnRequest y redirección PingAM',
    description: \`\${config.authnRequestMethod} \${config.endpoints.authnRequest}. Angular inicia la AuthnRequest contra NetScaler; el navegador recibe y sigue la redirección 302 hacia PingAM.\`,
  });
  this.authnRequestMethod.set(config.authnRequestMethod);
  this.authnRequestUrl.set(config.endpoints.authnRequest);`,
      },
      {
        description: 'RedirectHandler ejecuta la navegacion real: para GET usa window.location.assign(url), y el navegador sigue el 302 de NetScaler hacia PingAM.',
        file: 'front-app-login/src/app/saml-flow/presentation/shared/redirect-handler.component.ts',
        startLine: 19,
        endLine: 26,
        language: 'typescript',
        code: `ngOnInit(): void {
  /*
   * Si Citrix/back confirma POST para /authnRequest:
   * - opcion corta: cambiar AUTHN_REQUEST_METHOD a POST y enviar un form vacio autoenviado.
   * - opcion larga: anadir params configurables si /authnRequest exige campos hidden.
   */
  if (this.method === 'GET') window.location.assign(this.url);
}`,
      },
    ];
  }

  private getSsoUnauthorizedCodeSnippets(source: FlowCodeSource): FlowCodeSnippet[] {
    if (source === 'micro') {
      return [
        {
          description: 'Al cargar /login?samlSso=unauthorized, LoginComponent lee el query param y registra que PingAM no ha encontrado SSO Cookie.',
          file: 'front-app-login/src/app/login/presentation/pages/login/login.component.ts',
          startLine: 179,
          endLine: 187,
          language: 'typescript',
          code: `async ngOnInit(): Promise<void> {
  this.subscribeToOauthManager();

  if (this.route.snapshot.queryParamMap.get('samlSso') === 'unauthorized') {
    await this.flowConfirmation.confirm({
      title: 'Paso SAML: SSO Unauthorized en PingAM',
      description: 'Apigee/PingAM no encuentra una SSO Cookie activa. Devuelve el navegador a /login para iniciar el flujo OAuth.',
    });
  }`,
        },
      ];
    }

    return [];
  }

  private getOauthStartCodeSnippets(source: FlowCodeSource): FlowCodeSnippet[] {
    if (source === 'micro') {
      return [
        {
          description: 'El micro prepara la configuracion OAuth y entrega al OauthManager el endpoint que debe usar para iniciar el arbol de autenticacion.',
          file: 'front-app-login/src/app/login/presentation/pages/login/login.component.ts',
          startLine: 189,
          endLine: 197,
          language: 'typescript',
          code: `await this.oauthManager.authenticate({
  endpoints: {
    authenticate: getAuthenticateEndpoint(),
  },
  resumeAuthId: this.route.snapshot.queryParamMap.get('authId') ?? undefined,
  procedence:   this.loginDataService.getProcedence(),
  language:     this.loginTranslation.getLanguage(),
  confirmStep:  step => this.flowConfirmation.confirm(step),
});`,
        },
        {
          description: 'La URL de authenticate se resuelve segun el runtime: proxy de shell local, endpoint local directo o configuracion global desplegada.',
          file: 'front-app-login/src/app/login/application/services/oauth-endpoints.ts',
          startLine: 16,
          endLine: 20,
          language: 'typescript',
          code: `export const getAuthenticateEndpoint = (): string => {
  if (isLocalShellRuntime()) return shellProxyEndpoints.authenticate;
  if (environment.name === 'local') return environment.endpoints.authenticate;
  return window.BsAuthorizationConfig?.url?.authenticate ?? environment.endpoints.authenticate;
};`,
        },
      ];
    }

    return [
      {
        description: 'OauthManager entra en el camino de inicio normal porque no hay authId de reanudacion y lanza initiateAuth().',
        file: 'front-core-atlas/src/angular/packages/auth-manager/src/lib/oauth-manager.service.ts',
        startLine: 46,
        endLine: 64,
        language: 'typescript',
        code: `async authenticate(config: OauthManagerConfig): Promise<void> {
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
}`,
      },
      {
        description: 'initiateAuth ejecuta la primera llamada del arbol con body vacio; la respuesta se procesara como callbacks de PingAM.',
        file: 'front-core-atlas/src/angular/packages/auth-manager/src/lib/oauth-manager.service.ts',
        startLine: 148,
        endLine: 153,
        language: 'typescript',
        code: `private initiateAuth(): void {
  this.makeDriverCall({}).subscribe({
    next: response => void this.handleCallbackResponse(response),
    error: error => void this.handleError(error as HttpErrorResponse),
  });
}`,
      },
      {
        description: 'makeDriverCall materializa el POST /authenticate; en local usa HttpClient con cookies y en runtime real puede usar DataManager.',
        file: 'front-core-atlas/src/angular/packages/auth-manager/src/lib/oauth-manager.service.ts',
        startLine: 211,
        endLine: 227,
        language: 'typescript',
        code: `private makeDriverCall(body: Record<string, unknown>) {
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
  );`,
      },
    ];
  }

  private getRedirectCallbackCodeSnippets(source: FlowCodeSource): FlowCodeSnippet[] {
    if (source === 'micro') return [];

    return [
      {
        description: 'OauthManager inspecciona el primer callback recibido desde PingAM; si es RedirectCallback, delega en submitRedirectCallback().',
        file: 'front-core-atlas/src/angular/packages/auth-manager/src/lib/oauth-manager.service.ts',
        startLine: 174,
        endLine: 197,
        language: 'typescript',
        code: `private async handleCallbackResponse(response: Record<string, unknown>): Promise<void> {
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
  }`,
      },
      {
        description: 'Aqui se extrae redirectUrl y se crea el formulario GET autoenviado; form.submit() hace que el navegador salga hacia Entra ID/PingAM.',
        file: 'front-core-atlas/src/angular/packages/auth-manager/src/lib/oauth-manager.service.ts',
        startLine: 237,
        endLine: 260,
        language: 'typescript',
        code: `private async submitRedirectCallback(callbacks: AuthCallback[]): Promise<void> {
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
}`,
      },
    ];
  }

  private getOauthResumeCodeSnippets(source: FlowCodeSource): FlowCodeSnippet[] {
    if (source === 'micro') {
      return [
        {
          description: 'Al cargar /login?authId=..., LoginComponent arranca en ngOnInit y entrega el authId de la URL como resumeAuthId.',
          file: 'front-app-login/src/app/login/presentation/pages/login/login.component.ts',
          startLine: 179,
          endLine: 197,
          language: 'typescript',
          code: `async ngOnInit(): Promise<void> {
  this.subscribeToOauthManager();

  if (this.route.snapshot.queryParamMap.get('samlSso') === 'unauthorized') {
    await this.flowConfirmation.confirm({
      title: 'Paso SAML: SSO Unauthorized en PingAM',
      description: 'Apigee/PingAM no encuentra una SSO Cookie activa. Devuelve el navegador a /login para iniciar el flujo OAuth.',
    });
  }

  await this.oauthManager.authenticate({
    endpoints: {
      authenticate: getAuthenticateEndpoint(),
    },
    resumeAuthId: this.route.snapshot.queryParamMap.get('authId') ?? undefined,
    procedence:   this.loginDataService.getProcedence(),
    language:     this.loginTranslation.getLanguage(),
    confirmStep:  step => this.flowConfirmation.confirm(step),
  });`,
        },
      ];
    }

    return [
      {
        description: 'OauthManager detecta resumeAuthId, guarda el authId y salta al POST de reanudacion del arbol.',
        file: 'front-core-atlas/src/angular/packages/auth-manager/src/lib/oauth-manager.service.ts',
        startLine: 49,
        endLine: 57,
        language: 'typescript',
        code: `if (config.resumeAuthId) {
  await this.confirm({
    title: 'Paso OAuth: fallback transparente completo',
    description: 'Tras el redirect a Entra ID, PingAM procesa el error, prueba Kerberos ADGBS.com y Atenea, y devuelve 303 /login?authId=....',
  });
  this.authId = config.resumeAuthId;
  this.resumeAuth(config.resumeAuthId);
  return;
}`,
      },
      {
        description: 'resumeAuth envia POST /authenticate con body { authId }; PingAM devuelve los callbacks de credenciales si el fallback transparente termina ahi.',
        file: 'front-core-atlas/src/angular/packages/auth-manager/src/lib/oauth-manager.service.ts',
        startLine: 155,
        endLine: 160,
        language: 'typescript',
        code: `private resumeAuth(authId: string): void {
  this.makeDriverCall({ authId }).subscribe({
    next: response => void this.handleCallbackResponse(response),
    error: error => void this.handleError(error as HttpErrorResponse),
  });
}`,
      },
      {
        description: 'Al recibir NameCallback o PasswordCallback, OauthManager conserva los callbacks y publica REDIRECT_CREDENTIALS para que el micro pinte el formulario.',
        file: 'front-core-atlas/src/angular/packages/auth-manager/src/lib/oauth-manager.service.ts',
        startLine: 187,
        endLine: 193,
        language: 'typescript',
        code: `} else if (callbackType === NAME_CB || callbackType === PASSWORD_CB) {
  this.credentialCallbacks = callbacks ?? [];
  await this.confirm({
    title: 'Paso OAuth: resume',
    description: 'Tras volver a /login con authId, Angular reanuda el árbol. PingAM devuelve NameCallback y PasswordCallback con 200 OK.',
  });
  this.publish({ type: OAUTH_MANAGER_EVENTS.REDIRECT_CREDENTIALS });`,
      },
    ];
  }

  private getCredentialsFormCodeSnippets(source: FlowCodeSource): FlowCodeSnippet[] {
    if (source === 'micro') {
      return [
        {
          description: 'El micro recibe REDIRECT_CREDENTIALS y activa la UI de credenciales: resetea validaciones, muestra el formulario y engancha listeners.',
          file: 'front-app-login/src/app/login/presentation/pages/login/login.component.ts',
          startLine: 228,
          endLine: 235,
          language: 'typescript',
          code: `case OAUTH_MANAGER_EVENTS.REDIRECT_CREDENTIALS:
  // Todos los métodos transparentes fallaron — mostrar formulario
  this.usernameValid.set(false);
  this.passwordValid.set(false);
  this.credentialListenersAttached = false;
  this.showCredentialsForm.set(true);
  setTimeout(() => this.listenCredentialFields());
  break;`,
        },
        {
          description: 'El template pinta el formulario solo cuando showCredentialsForm() pasa a true; el boton queda bloqueado hasta validar usuario y password.',
          file: 'front-app-login/src/app/login/presentation/pages/login/login.component.ts',
          startLine: 61,
          endLine: 80,
          language: 'typescript',
          code: `@if(showCredentialsForm()){
  <bs-row class="pt-xxxl">
    <bs-col size--2-4>
      <bs-col size--1-1 class="logo-container">
        <bs-logo color="colored" size="sm"></bs-logo>
      </bs-col>
      <bs-form class="full" show-main-error>
        
        <bs-input name="USERNAME" class="form-element flex--full"
          label="{{getTranslation('login:APP.LOGIN_STEP.DOCUMENT_FIELD')}}"
          required #usernameInput></bs-input>
        <bs-input type="password" name="PASSWORD" class="form-element flex--full"
          label="{{getTranslation('login:APP.LOGIN_STEP.PASSWORD_FIELD')}}"
          required #passwordInput></bs-input>
        <bs-buttons-set class="stack">
          <bs-button [disabled]="!(usernameValid() && passwordValid())"
            class="primary flex--full size-md"
            (bsButtonClick)="submitCredentials()">
            {{getTranslation('login:APP.LOGIN_STEP.SUBMIT')}}`,
        },
        {
          description: 'Los listeners sincronizan la validez de los web components con signals Angular para habilitar el submit solo cuando hay valores validos.',
          file: 'front-app-login/src/app/login/presentation/pages/login/login.component.ts',
          startLine: 281,
          endLine: 297,
          language: 'typescript',
          code: `usernameElement.addEventListener('bsInputInput', (e: Event) => {
  this.usernameValid.set(this.hasInputValue(e, usernameElement));
});
usernameElement.addEventListener('bsInputValidate', (e: Event) => {
  this.usernameValid.set(this.isValidInput(e, usernameElement));
});

passwordElement.addEventListener('bsInputInput', (e: Event) => {
  this.passwordValid.set(this.hasInputValue(e, passwordElement));
});
passwordElement.addEventListener('bsInputValidate', (e: Event) => {
  this.passwordValid.set(this.isValidInput(e, passwordElement));
});

this.usernameValid.set(this.hasInputValue(undefined, usernameElement));
this.passwordValid.set(this.hasInputValue(undefined, passwordElement));
this.credentialListenersAttached = true;`,
        },
      ];
    }

    return [
      {
        description: 'OauthManager publica REDIRECT_CREDENTIALS tras recibir NameCallback o PasswordCallback; ese evento es la orden para que el micro pinte el formulario.',
        file: 'front-core-atlas/src/angular/packages/auth-manager/src/lib/oauth-manager.service.ts',
        startLine: 187,
        endLine: 193,
        language: 'typescript',
        code: `} else if (callbackType === NAME_CB || callbackType === PASSWORD_CB) {
  this.credentialCallbacks = callbacks ?? [];
  await this.confirm({
    title: 'Paso OAuth: resume',
    description: 'Tras volver a /login con authId, Angular reanuda el árbol. PingAM devuelve NameCallback y PasswordCallback con 200 OK.',
  });
  this.publish({ type: OAUTH_MANAGER_EVENTS.REDIRECT_CREDENTIALS });`,
      },
    ];
  }

  private getCredentialsSubmitCodeSnippets(source: FlowCodeSource): FlowCodeSnippet[] {
    if (source === 'micro') {
      return [
        {
          description: 'El micro lee los valores del formulario, oculta la UI de credenciales y delega el submit en OauthManager.',
          file: 'front-app-login/src/app/login/presentation/pages/login/login.component.ts',
          startLine: 244,
          endLine: 252,
          language: 'typescript',
          code: `// Caso 4 — submit del formulario de credenciales
submitCredentials(): void {
  const username = this.usernameInput?.nativeElement?.value ?? '';
  const password = this.passwordInput?.nativeElement?.value ?? '';

  this.loading.set(true);
  this.showCredentialsForm.set(false);
  this.credentialListenersAttached = false;
  this.oauthManager.submitCredentials(username, password);`,
        },
      ];
    }

    return [
      {
        description: 'submitCredentials es la API publica del manager para el formulario; internamente delega en credentialsAuth().',
        file: 'front-core-atlas/src/angular/packages/auth-manager/src/lib/oauth-manager.service.ts',
        startLine: 82,
        endLine: 84,
        language: 'typescript',
        code: `async submitCredentials(username: string, password: string): Promise<void> {
  this.credentialsAuth(username, password);
}`,
      },
      {
        description: 'credentialsAuth construye el body con authId y callbacks rellenados, y ejecuta POST /authenticate mediante makeDriverCall().',
        file: 'front-core-atlas/src/angular/packages/auth-manager/src/lib/oauth-manager.service.ts',
        startLine: 162,
        endLine: 171,
        language: 'typescript',
        code: `private credentialsAuth(username: string, password: string): void {
  const body = {
    authId: this.authId,
    callbacks: this.buildCredentialCallbacks(username, password),
  };

  this.makeDriverCall(body).subscribe({
    next: response => void this.handleSuccess(response),
    error: error => void this.handleError(error as HttpErrorResponse),
  });
}`,
      },
      {
        description: 'buildCredentialCallbacks inyecta username/password en los inputs que espera PingAM: IDToken1 para NameCallback e IDToken2 para PasswordCallback.',
        file: 'front-core-atlas/src/angular/packages/auth-manager/src/lib/oauth-manager.service.ts',
        startLine: 369,
        endLine: 386,
        language: 'typescript',
        code: `private buildCredentialCallbacks(username: string, password: string): AuthCallback[] {
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
}`,
      },
    ];
  }

  private getOauthSuccessCodeSnippets(source: FlowCodeSource): FlowCodeSnippet[] {
    if (source === 'micro') {
      return [
        {
          description: 'El micro recibe AUTH_SUCCESS desde OauthManager: guarda el payload con tokenId y continua el flujo navegando a /authorize.',
          file: 'front-app-login/src/app/login/presentation/pages/login/login.component.ts',
          startLine: 221,
          endLine: 226,
          language: 'typescript',
          code: `case OAUTH_MANAGER_EVENTS.AUTH_SUCCESS:
  // SSO Cookie establecida — continuar con el OAuth flow
  this.loginDataService.setSuccessData(event.payload as ISuccessOtpRespone);
  console.log("navegación a authorize");
  this.router.navigate([ROUTE_DATA.AUTHORIZE]);
  break;`,
        },
        {
          description: 'La constante de rutas traduce esa continuacion a la pantalla authorize del micro, siguiente paso del intercambio OAuth.',
          file: 'front-app-login/src/app/login/domain/constants/path.constant.ts',
          startLine: 1,
          endLine: 10,
          language: 'typescript',
          code: `export const SHELL_ROUTE = "";
export enum ROUTE_DATA  {
    LOGIN = SHELL_ROUTE + 'login',
    OTP = SHELL_ROUTE + 'otp',
    SUCCESS = SHELL_ROUTE + 'success',
    GET_TOKENS = SHELL_ROUTE + 'token',
    AUTHORIZE = SHELL_ROUTE + 'authorize',
    ERROR = SHELL_ROUTE + 'error-mfe',
    ROOT = SHELL_ROUTE + "",
}`,
        },
      ];
    }

    return [
      {
        description: 'La respuesta OK del POST de credenciales entra en handleSuccess; ahi se registra el step y se publica AUTH_SUCCESS con el payload.',
        file: 'front-core-atlas/src/angular/packages/auth-manager/src/lib/oauth-manager.service.ts',
        startLine: 199,
        endLine: 205,
        language: 'typescript',
        code: `private async handleSuccess(response: Record<string, unknown>): Promise<void> {
  await this.confirm({
    title: 'Paso OAuth: autenticación OK',
    description: 'PingAM ha respondido con tokenId. Se va a publicar AUTH_SUCCESS.',
  });
  this.publish({ type: OAUTH_MANAGER_EVENTS.AUTH_SUCCESS, payload: response });
}`,
      },
    ];
  }

  private getTokenRequestCodeSnippets(source: FlowCodeSource): FlowCodeSnippet[] {
    if (source === 'micro') {
      return [
        {
          description: 'TokensComponent lee code/state de la URL, recupera el tokenId guardado y delega el intercambio /token en OauthManager.',
          file: 'front-app-login/src/app/login/presentation/pages/get-tokens/get-tokens.component.ts',
          startLine: 68,
          endLine: 110,
          language: 'typescript',
          code: `async gettingTokens(){ 
  const code = this.route.snapshot.queryParamMap.get('code')??"";
  const state = this.route.snapshot.queryParamMap.get('state')??"";
  const authConfig = this.getAuthorizationConfig();
  if (!authConfig.clientId || !authConfig.redirectUri) {
    this.publishService.publishEvent(LOGIN_EVENTS.ERROR);
    return;
  }
  const clientId = authConfig.clientId;
  const redirectUri = authConfig.redirectUri;
  const token_sso = this.loginDataService.successData().tokenId;
  const url = getTokensEndpoint();
 
  try {
    await this.flowConfirmation.confirm({
      title: 'Paso OAuth: token request',
      description: 'TokensComponent lee code/state de la URL y solicita OIDC/OAuth tokens a PingAM con POST /token.',
    });
    this.authorizeResponse =  (await this.oauthManager.exchangeAuthorizationCode({
      tokenUrl: url,
      tokenId: token_sso,
      code,
      state,
      clientId,
      redirectUri,
    })).data as TokensResponse;

    setAuthorization({OIDC: this.authorizeResponse.id_token, OAUTH: this.authorizeResponse.access_token} as AuthorizationTokens)
    this.publishService.publishOauthEvent(LOGIN_EVENTS.TOKENS)
    this.processing.set(false);
    await this.samlRuntimeConfig.whenReady();
    void this.router.navigate([SAML_ROUTE_DATA.AUTHORIZATION_REQUEST]);`,
        },
      ];
    }

    return [
      {
        description: 'exchangeAuthorizationCode valida code/state, prepara body/cabeceras y ejecuta el POST /token usando driver o HTTP local.',
        file: 'front-core-atlas/src/angular/packages/auth-manager/src/lib/oauth-manager.service.ts',
        startLine: 113,
        endLine: 146,
        language: 'typescript',
        code: `async exchangeAuthorizationCode(request: OauthTokenExchangeRequest): Promise<DataManagerResponse<TokensResponse>> {
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
}`,
      },
    ];
  }

  private getAuthorizeRedirectCodeSnippets(source: FlowCodeSource): FlowCodeSnippet[] {
    if (source === 'micro') {
      return [
        {
          description: 'AuthorizeComponent toma el tokenId obtenido en authenticate, arma el contexto OAuth y delega el formulario /authorize en OauthManager.',
          file: 'front-app-login/src/app/login/presentation/pages/authorize/authorize.component.ts',
          startLine: 58,
          endLine: 99,
          language: 'typescript',
          code: `async authorizing(){
  const csrf = this.loginDataService.successData().tokenId;
  if (!csrf) {
    /*
     * Sin tokenId no hay sesion PingAM validada: se vuelve al formulario para
     * reconstruir el arbol de autenticacion desde el inicio.
     */
    this.router.navigate([\`../\${ROUTE_DATA.LOGIN}\`], { relativeTo: this.route });
    return;
  }

  const authConfig = this.getAuthorizationConfig();
  if (!authConfig.clientId || !authConfig.redirectUri) {
    /*
     * En primera carga remota puede ocurrir que window.BsAuthorizationConfig aun
     * no exista. Si tampoco hay AUTH_CONFIG inyectada, el flujo no puede pedir
     * authorization code y se publica error controlado.
     */
    this.publishService.publishEvent(LOGIN_EVENTS.ERROR);
    return;
  }

  /*
   * POST /authorize mockeado: usa el tokenId SSO como assertion/csrf para pedir
   * un authorization code OAuth. PingAM responde 302 Location hacia /token.
   */
  const authorizeParams: OauthAuthorizeRequest =  {
    authorizeUrl: getAuthorizeEndpoint(),
    clientId:  authConfig.clientId,
    redirectUri:  authConfig.redirectUri,
    csrf,
  }
  if (authConfig.scopes?.length) authorizeParams.scope = authConfig.scopes.join(' ')

  try {
    this.processing.set(false);
    await this.flowConfirmation.confirm({
      title: 'Paso OAuth: authorize redirect',
      description: 'Tras credenciales, Angular llama a authorize con params OAuth y csrf/assertion=tokenId. PingAM responde 302 Location /token?code=...&state=....',
    });

    await this.oauthManager.authorize(authorizeParams);`,
        },
      ];
    }

    return [
      {
        description: 'authorize vive ahora en auth-manager: genera state/PKCE, anade assertion/csrf y delega la salida al formulario POST.',
        file: 'front-core-atlas/src/angular/packages/auth-manager/src/lib/oauth-manager.service.ts',
        startLine: 86,
        endLine: 110,
        language: 'typescript',
        code: `async authorize(request: OauthAuthorizeRequest): Promise<DataManagerResponse<AuthorizeResponse>> {
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
}`,
      },
      {
        description: 'postFormAndLeaveApp materializa la navegacion real: crea hidden inputs y hace submit del formulario fuera de Angular.',
        file: 'front-core-atlas/src/angular/packages/auth-manager/src/lib/oauth-manager.service.ts',
        startLine: 262,
        endLine: 278,
        language: 'typescript',
        code: `private postFormAndLeaveApp<T>(url: string, params: URLSearchParams): Promise<DataManagerResponse<T>> {
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
}`,
      },
    ];
  }

  private highlightCodeLine(line: string): FlowCodeToken[] {
    const tokens: FlowCodeToken[] = [];
    const pattern = /(\/\*.*\*\/|\/\/.*|`(?:\\.|[^`])*`|'(?:\\.|[^'])*'|"(?:\\.|[^"])*"|\b(?:async|await|break|case|const|else|export|if|instanceof|interface|new|private|return|switch|this|type|typeof|void)\b|\b(?:Promise|Record|SamlAuthorizationContext|SamlManagerEvent|OauthManagerConfig|OauthManagerEvent|OauthAuthorizeRequest|OauthTokenExchangeRequest|AuthCallback|ISuccessOtpRespone|AuthorizeRequest|AuthorizeResponse|TokensRequest|TokensResponse|AuthorizationTokens|SAML_MANAGER_EVENTS|SAML_ROUTE_DATA|OAUTH_MANAGER_EVENTS|ROUTE_DATA|LOGIN_EVENTS|EventManager|StorageManager|HttpErrorResponse|HttpHeaders|DataManagerResponse|Error|Boolean|URL|URLSearchParams|REDIRECT_CB|HTTP_CB|NAME_CB|PASSWORD_CB|DRIVER|DEFAULT_CONTENT_TYPE|environment|window|document|getAuthenticateEndpoint|getAuthorizeEndpoint|getTokensEndpoint|getConfiguredDriver|postJson|postFormAndLeaveApp|generateRandomString|generateCodeChallenge|hasDriver|getDriver|from|filter|map|setTimeout|btoa|localStorage|unknown|string|undefined|true|false)\b|\b\d+\b)/g;
    let cursor = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(line)) !== null) {
      if (match.index > cursor) {
        tokens.push({ kind: 'plain', text: line.slice(cursor, match.index) });
      }

      const text = match[0];
      const kind = this.getCodeTokenKind(text);
      tokens.push({ kind, text });
      cursor = match.index + text.length;
    }

    if (cursor < line.length) {
      tokens.push({ kind: 'plain', text: line.slice(cursor) });
    }

    return tokens.length > 0 ? tokens : [{ kind: 'plain', text: '' }];
  }

  private getCodeTokenKind(token: string): FlowCodeTokenKind {
    if (token.startsWith('//') || token.startsWith('/*')) return 'comment';
    if (token.startsWith('"') || token.startsWith('\'') || token.startsWith('`')) return 'string';
    if (/^\d+$/.test(token)) return 'number';
    if (/^(Promise|Record|SamlAuthorizationContext|SamlManagerEvent|OauthManagerConfig|OauthManagerEvent|OauthAuthorizeRequest|OauthTokenExchangeRequest|AuthCallback|ISuccessOtpRespone|AuthorizeRequest|AuthorizeResponse|TokensRequest|TokensResponse|AuthorizationTokens|SAML_MANAGER_EVENTS|SAML_ROUTE_DATA|OAUTH_MANAGER_EVENTS|ROUTE_DATA|LOGIN_EVENTS|EventManager|StorageManager|HttpErrorResponse|HttpHeaders|DataManagerResponse|Error|Boolean|URL|URLSearchParams|REDIRECT_CB|HTTP_CB|NAME_CB|PASSWORD_CB|DRIVER|DEFAULT_CONTENT_TYPE|environment|window|document|getAuthenticateEndpoint|getAuthorizeEndpoint|getTokensEndpoint|getConfiguredDriver|postJson|postFormAndLeaveApp|generateRandomString|generateCodeChallenge|hasDriver|getDriver|from|filter|map|setTimeout|btoa|localStorage|unknown|string|undefined|true|false)$/.test(token)) {
      return 'type';
    }
    return 'keyword';
  }
}

type FlowCodeSource = 'micro' | 'oauthManager';

interface FlowCodeSnippet {
  description: string;
  file: string;
  startLine: number;
  endLine: number;
  language: 'typescript';
  code: string;
}

type FlowCodeTokenKind = 'plain' | 'keyword' | 'string' | 'comment' | 'number' | 'type';

interface FlowCodeToken {
  kind: FlowCodeTokenKind;
  text: string;
}
