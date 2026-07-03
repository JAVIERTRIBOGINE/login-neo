import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, Component, ElementRef, inject, ViewChild, WritableSignal, signal, AfterViewInit, OnInit, OnDestroy } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LoaderComponent } from '../../shared/loader.component';
import { ActivatedRoute, Router } from '@angular/router';
import { PublishService } from '@app/login/application/services/publish.service';
import { LOGIN_EVENTS } from '@app/login/domain/constants/event.enum';
import { TranslatePipe, TranslateService } from '@proteo/ng-translate';
import { LoginTranslationService } from '@app/login/application/services/login-translation.service';
import { ROUTE_DATA } from '@app/login/domain/constants/path.constant';
import { MessageService } from '@app/login/application/services/message.service';
import { LoginDataService } from '@app/login/application/services/login-data.service';
import { StorageManager } from '@proteo/storage-utils';
import { Subscription } from 'rxjs';
import { ISuccessOtpRespone } from '@app/login/domain/models/Tree-callback.model';
import { getAuthenticateEndpoint } from '@app/login/application/services/oauth-endpoints';

// ─── OauthManager (Proteo4) ───────────────────────────────────────────────────
import { OauthManagerService, OAUTH_MANAGER_EVENTS } from '@proteo/auth-manager';
import { FlowConfirmationModalService } from '@app/login/application/services/flow-confirmation-modal.service';

// ─── Lógica de orquestación desplazada a OauthManager ────────────────────────
// Los imports siguientes quedan comentados: la orquestación de los 4 casos
// (InitiateAuth, ResumeAuth, KerberosAuth, CredentialsAuth) ya no reside aquí.
//
// import { InitiateAuthUseCase }   from '@app/login/domain/use-cases/initiate-auth.usecase';
// import { ResumeAuthUseCase }     from '@app/login/domain/use-cases/resume-auth.usecase';
// import { KerberosAuthUseCase }   from '@app/login/domain/use-cases/kerberos-auth.usecase';
// import { CredentialsAuthUseCase } from '@app/login/domain/use-cases/credentials-auth.usecase';
// import { InitiateAuthRepository }  from '@app/login/domain/repositories/initiate-auth.repository';
// import { ResumeAuthRepository }    from '@app/login/domain/repositories/resume-auth.repository';
// import { KerberosAuthRepository }  from '@app/login/domain/repositories/kerberos-auth.repository';
// import { CredentialsAuthRepository } from '@app/login/domain/repositories/credentials-auth.repository';
// import { InitiateAuthBackendRepository }   from '@app/login/infrastructure/backend/initiate-auth-backend.repository';
// import { ResumeAuthBackendRepository }     from '@app/login/infrastructure/backend/resume-auth-backend.repository';
// import { KerberosAuthBackendRepository }   from '@app/login/infrastructure/backend/kerberos-auth-backend.repository';
// import { CredentialsAuthBackendRepository } from '@app/login/infrastructure/backend/credentials-auth-backend.repository';
// import { CallbackModel, ISuccessOtpRespone, TreeCallbackModel } from '@app/login/domain/models/Tree-callback.model';
// const CALLBACK_TYPES = { REDIRECT: 'RedirectCallback', HTTP: 'HttpCallback' } as const;

@Component({
  selector: 'bs-custom-login',
  standalone: true,
  imports: [CommonModule, FormsModule, LoaderComponent, ReactiveFormsModule, TranslatePipe],
  providers: [
    TranslateService,
    MessageService,
    // ─── Providers desplazados a OauthManager ──────────────────────────────────
    // { provide: InitiateAuthRepository,    useClass: InitiateAuthBackendRepository },
    // { provide: ResumeAuthRepository,      useClass: ResumeAuthBackendRepository },
    // { provide: KerberosAuthRepository,    useClass: KerberosAuthBackendRepository },
    // { provide: CredentialsAuthRepository, useClass: CredentialsAuthBackendRepository },
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template:
  `
  <bs-section style="margin: 0 auto">
   @if(loading()){
      <bs-loader></bs-loader>
    }
    @if(showCredentialsForm()){
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
                {{getTranslation('login:APP.LOGIN_STEP.SUBMIT')}}
              </bs-button>
            </bs-buttons-set>
          </bs-form>
        </bs-col>
        <bs-col size--2-4>
          <div class="control-mobile">
            <bs-imagery aspect-ratio="normal" size="100" imageSource="{{imagePath()}}"></bs-imagery>
          </div>
        </bs-col> 
      </bs-row>
    }
    <bs-row class="pt-xxxl">

    <bs-col size--2-4 class="mock-credentials" aria-label="Credenciales mock">
              <p class="mock-credentials__title">Credenciales mock success</p>
                <div>
                  Usuario:43734794H
                </div>
                <div>
                Password:2026
                </div>
              
            </bs-col>
            </bs-row>
  </bs-section>
  `,
  styles:[`
    :host {
      .logo-container {
        display: flex;
        align-items: center;
        flex-direction: column;
      }
      bs-buttons-set { --_bs-button-set-flex-direction: column; }
      .mock-credentials {
        margin: 0 0 24px;
        padding: 16px;
        border: 1px solid #d9e0e8;
        border-radius: 8px;
        background: #f7f9fb;
        color: #1f2937;
      }
      .mock-credentials__title {
        margin: 0 0 12px;
        font-size: 14px;
        font-weight: 600;
        line-height: 1.4;
      }
      .mock-credentials dl {
        display: grid;
        gap: 8px;
        margin: 0;
      }
      .mock-credentials div {
        display: flex;
        justify-content: space-between;
        gap: 16px;
      }
      .mock-credentials dt {
        margin: 0;
        color: #4b5563;
      }
      .mock-credentials dd {
        margin: 0;
        font-weight: 600;
      }
      .control-mobile {
        margin: auto;
        display: none;
        position: relative;
        background-color: rgb(231 229 229);
        height: 100%;
        @media (min-width: 769px) { display: block; }
      }
    }
  `]
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('usernameInput', { read: ElementRef }) usernameInput!: ElementRef;
  @ViewChild('passwordInput', { read: ElementRef }) passwordInput!: ElementRef;

  loading:             WritableSignal<boolean>      = signal(true);
  showCredentialsForm: WritableSignal<boolean>      = signal(false);
  usernameValid:       WritableSignal<boolean>      = signal(false);
  passwordValid:       WritableSignal<boolean>      = signal(false);
  imagePath:           WritableSignal<string | null> = signal(StorageManager.getInstance().get<string>('imglg'));

  private router           = inject(Router);
  private route            = inject(ActivatedRoute);
  private loginTranslation = inject(LoginTranslationService);
  private publishService   = inject(PublishService);
  private loginDataService = inject(LoginDataService);
  private oauthManager      = inject(OauthManagerService);
  private flowConfirmation = inject(FlowConfirmationModalService);

  private oauthSub!: Subscription;
  private credentialListenersAttached = false;

  async ngOnInit(): Promise<void> {
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
    });

    // ─── Lógica desplazada a OauthManager ────────────────────────────────────
    // const authIdFromUrl = this.route.snapshot.queryParamMap.get('authId');
    // if (authIdFromUrl) {
    //   this.currentAuthId.set(authIdFromUrl);
    //   this.resumeAuth(authIdFromUrl);
    // } else {
    //   this.initiateAuth();
    // }
  }

  ngAfterViewInit(): void {
    if (this.showCredentialsForm()) this.listenCredentialFields();
  }

  // ─── Responde a los eventos emitidos por OauthManager ────────────────────────

  private subscribeToOauthManager(): void {
    this.oauthSub = this.oauthManager.events$.subscribe(event => {
      this.loading.set(false);

      switch (event.type) {

        case OAUTH_MANAGER_EVENTS.AUTH_SUCCESS:
          // SSO Cookie establecida — continuar con el OAuth flow
          this.loginDataService.setSuccessData(event.payload as ISuccessOtpRespone);
          console.log("navegación a authorize");
          this.router.navigate([ROUTE_DATA.AUTHORIZE]);
          break;

        case OAUTH_MANAGER_EVENTS.REDIRECT_CREDENTIALS:
          // Todos los métodos transparentes fallaron — mostrar formulario
          this.usernameValid.set(false);
          this.passwordValid.set(false);
          this.credentialListenersAttached = false;
          this.showCredentialsForm.set(true);
          setTimeout(() => this.listenCredentialFields());
          break;

        case OAUTH_MANAGER_EVENTS.AUTH_ERROR:
          this.publishService.publishEvent(LOGIN_EVENTS.ERROR);
          break;
      }
    });
  }

  // Caso 4 — submit del formulario de credenciales
  submitCredentials(): void {
    const username = this.usernameInput?.nativeElement?.value ?? '';
    const password = this.passwordInput?.nativeElement?.value ?? '';

    this.loading.set(true);
    this.showCredentialsForm.set(false);
    this.credentialListenersAttached = false;
    this.oauthManager.submitCredentials(username, password);

    // ─── Lógica desplazada a OauthManager ──────────────────────────────────
    // this.credentialsAuthUseCase.execute({
    //   authId: this.currentAuthId(),
    //   username,
    //   password,
    // }).subscribe({
    //   next:  (response) => this.handleSuccessResponse(response),
    //   error: (error)    => this.handleError(error),
    // });
  }

  // ─── Métodos desplazados a OauthManager ──────────────────────────────────────
  // private initiateAuth(): void { ... }
  // private resumeAuth(authId: string): void { ... }
  // private kerberosAuth(authId: string, callbacks: CallbackModel[]): void { ... }
  // private handleCallbackResponse(response: TreeCallbackModel): void { ... }
  // private handleSuccessResponse(response: ISuccessOtpRespone): void { ... }
  // private submitRedirectCallback(callback: CallbackModel): void { ... }
  // private handleError(error: HttpErrorResponse): void { ... }
  // private isSuccessResponse(response: TreeCallbackModel | ISuccessOtpRespone): boolean { ... }

  private listenCredentialFields(): void {
    if (this.credentialListenersAttached || !this.usernameInput || !this.passwordInput) return;

    const usernameElement = this.usernameInput.nativeElement;
    const passwordElement = this.passwordInput.nativeElement;

    usernameElement.addEventListener('bsInputInput', (e: Event) => {
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
    this.credentialListenersAttached = true;
  }

  private isValidInput(event: Event, element: { value?: string }): boolean {
    return event instanceof CustomEvent && event.detail === ''
      ? true
      : this.hasInputValue(event, element);
  }

  private hasInputValue(event: Event | undefined, element: { value?: string }): boolean {
    if (event instanceof CustomEvent && typeof event.detail === 'string') {
      return event.detail.trim().length > 0;
    }

    return (element.value ?? '').trim().length > 0;
  }

  getTranslation(key: string): string {
    return this.loginTranslation.translateFromKey(key);
  }

  ngOnDestroy(): void {
    this.oauthSub?.unsubscribe();
    this.loading.set(false);
  }
}
