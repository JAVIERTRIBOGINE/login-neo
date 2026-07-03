import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, WritableSignal, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TokensResponse, AuthorizationTokens } from '@proteo/types';
import { PublishService } from '@app/login/application/services/publish.service';
import {  setAuthorization, storedTokens } from '@proteo/data-manager';
import { LoginDataService } from '@app/login/application/services/login-data.service';
import { LOGIN_EVENTS } from '@app/login/domain/constants/event.enum';
import { END_SESSION_FN, REVOKE_FN } from '@app/login/domain/constants/global.constants';
import { getTokensEndpoint } from '@app/login/application/services/oauth-endpoints';
import { SAML_ROUTE_DATA } from '@app/saml-flow/domain/constants/path.constant';
import { FlowConfirmationModalService } from '@app/login/application/services/flow-confirmation-modal.service';
import { OauthManagerService } from '@proteo/auth-manager';


@Component({
  selector: 'bs-last-step',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule],
  
  template: `
  <bs-section style="margin: 0 auto">
    @if(processing()) {
    <bs-loader></bs-loader>
    }
    @if(error()){
      <bs-error></bs-error>
    } 
  </bs-section>
  `
})
export class GetTokensComponent implements OnInit{
    route: ActivatedRoute;
    router: Router;
    publishService: PublishService;
    processing!: WritableSignal<boolean>;
    tokensOk!: WritableSignal<boolean>;
    revoke = inject(REVOKE_FN);
    endSession = inject(END_SESSION_FN)

    error!: WritableSignal<boolean>;
    authorizeResponse!: TokensResponse;
    loginDataService!: LoginDataService;
    flowConfirmation = inject(FlowConfirmationModalService);
    oauthManager = inject(OauthManagerService);
    storedTokens = storedTokens;
    
    

    constructor(){
      this.route = inject(ActivatedRoute)
      this.router = inject(Router)
      this.publishService = inject(PublishService)
      this.processing = signal(true)
      this.tokensOk = signal(false)
      this.error = signal(false)
      this.loginDataService = inject(LoginDataService)
    }

    ngOnInit(): void {
      this.gettingTokens()
    }
    

    async gettingTokens(){ 
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const code = this.route.snapshot.queryParamMap.get('code')??"";
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const state = this.route.snapshot.queryParamMap.get('state')??"";
      /*
       * /authorize nos devuelve code/state por query params. Con esos datos y la
       * misma configuracion OAuth se llama a /token para obtener OIDC/OAuth tokens.
       */
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
        
        /*
         * Los tokens se registran en data-manager para que el resto de la solucion
         * global pueda consumirlos. Despues se rellama a /authnRequest para que
         * NetScaler emita una SAMLRequest nueva y redirija a PingAM.
         */
        setAuthorization({OIDC: this.authorizeResponse.id_token, OAUTH: this.authorizeResponse.access_token} as AuthorizationTokens)
        this.publishService.publishOauthEvent(LOGIN_EVENTS.TOKENS)
        this.processing.set(false);
        void this.router.navigate([SAML_ROUTE_DATA.AUTHORIZATION_REQUEST]);
      } catch (error) {
          this.processing.set(false);
          this.error.set(true);
          this.publishService.publishEvent(LOGIN_EVENTS.ERROR) 
      }
    }

    private getAuthorizationConfig(): { clientId?: string; redirectUri?: string } {
      /*
       * Mismo fallback que AuthorizeComponent: preferimos BsAuthorizationConfig,
       * pero aceptamos la AUTH_CONFIG capturada por Application durante bootstrap.
       */
      const windowConfig = window.BsAuthorizationConfig;
      const authConfig = window.NEO_LOGIN_AUTH_CONFIG as Record<string, unknown> | undefined;
      const configuredRedirectUri = windowConfig?.redirectUri ?? authConfig?.['REDIRECT_URI'] as string | undefined;
      const shellRedirectUri = (window as Window & { NEO_SHELL?: boolean }).NEO_SHELL
        ? `${window.location.origin}/token`
        : configuredRedirectUri;

      return {
        clientId: windowConfig?.clientID ?? authConfig?.['CLIENT_ID'] as string | undefined,
        redirectUri: shellRedirectUri,
      }
    }

  
  }
