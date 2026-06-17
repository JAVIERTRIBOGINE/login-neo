import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, WritableSignal, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {  TokensRequest, TokensResponse, AuthorizationTokens } from '@proteo/types';
import { PublishService } from '@app/login/application/services/publish.service';
import {  setAuthorization, storedTokens } from '@proteo/data-manager';
import { LoginDataService } from '@app/login/application/services/login-data.service';
import { LOGIN_EVENTS } from '@app/login/domain/constants/event.enum';
import { environment } from 'src/environments/environment';
import { END_SESSION_FN, GET_TOKENS_FN, REVOKE_FN } from '@app/login/domain/constants/global.constants';
import { SAML_ROUTE_DATA } from '@app/saml-flow/domain/constants/path.constant';


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
    getTokens = inject(GET_TOKENS_FN);
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
      const clientId = window.BsAuthorizationConfig.clientID;
      const redirectUri = window.BsAuthorizationConfig.redirectUri;
      const token_sso = this.loginDataService.successData().tokenId;
      const params: TokensRequest = {code, state, clientId, redirectUri};  
      const url = environment.name === 'local'
        ? environment.endpoints.tokens
        : window.BsAuthorizationConfig.url.token ?? environment.endpoints.tokens;
     
      try {
        this.authorizeResponse =  (await this.getTokens(url, token_sso, params)).data as TokensResponse;
        
        setAuthorization({OIDC: this.authorizeResponse.id_token, OAUTH: this.authorizeResponse.access_token} as AuthorizationTokens)
        this.publishService.publishOauthEvent(LOGIN_EVENTS.TOKENS)
        this.processing.set(false);
        this.router.navigate([SAML_ROUTE_DATA.RESOURCES]);
      } catch (error) {
          this.publishService.publishEvent(LOGIN_EVENTS.ERROR) 
      }
    }

  
  }

