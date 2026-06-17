import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, WritableSignal, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@proteo/ng-translate';
import { AuthorizeRequest, AuthorizeResponse, DataManagerResponse } from '@proteo/types';
import { PublishService } from '@app/login/application/services/publish.service';
import { LoginDataService } from '@app/login/application/services/login-data.service';
import { LOGIN_EVENTS } from '@app/login/domain/constants/event.enum';
import { HttpErrorResponse } from '@angular/common/http';
import { ROUTE_DATA } from '@app/login/domain/constants/path.constant';
import { AUTHORIZE_FN } from '@app/login/domain/constants/global.constants';



@Component({
  selector: 'bs-last-step',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, RouterOutlet, TranslatePipe],
  template: `
  <bs-section style="margin: 0 auto">
    @if(processing()) {
    <bs-loader></bs-loader>
    }@else if(error()){
      <bs-error></bs-error>
    }
  </bs-section>
  `
})
export class AuthorizeComponent implements OnInit{
  processing: WritableSignal<boolean>;
  error: WritableSignal<boolean>;
  conformedRedirectUri: WritableSignal<string> = signal("");
  authorizeResponse!: DataManagerResponse<AuthorizeResponse>;
  router: Router;
  route: ActivatedRoute
  publishService: PublishService;
  loginDataService: LoginDataService;
  authorize = inject(AUTHORIZE_FN)


  constructor(){
    this.processing = signal(true);
    this.error = signal(false);
    this.router = inject(Router);
    this.route = inject(ActivatedRoute);
    this.publishService = inject(PublishService);
    this.loginDataService = inject(LoginDataService);
  }

  ngOnInit(): void {
    this.authorizing();
  }



  async authorizing(){
    const csrf = this.loginDataService.successData().tokenId;
    if (!csrf) {
      this.router.navigate([`../${ROUTE_DATA.LOGIN}`], { relativeTo: this.route });
      return;
    }

    const authorizeParams: AuthorizeRequest =  {
      clientId:  window.BsAuthorizationConfig.clientID,
      redirectUri:  window.BsAuthorizationConfig.redirectUri,
      method: 'post',
      csrf,
    }
    if (window.BsAuthorizationConfig.scopes) authorizeParams.scope = window.BsAuthorizationConfig.scopes.join(' ')

    try {
      this.authorizeResponse = await this.authorize( authorizeParams );

      this.processing.set(false);

      this.conformUrl(this.authorizeResponse?.url as string)

    } catch( error  ) {
      const resolvedError = error as unknown as HttpErrorResponse
      if(resolvedError.status > 399 && resolvedError.status < 500) {
         this.router.navigate( [ `../${ROUTE_DATA.LOGIN}`], {relativeTo: this.route})
        } else if(resolvedError.status > 499) {
          this.publishService.publishEvent(LOGIN_EVENTS.ERROR)
        } else {
          this.conformUrl((error as  unknown as  HttpErrorResponse)?.url ?? '')
        }
    }
  }

  private conformUrl = (location: string) => {
    const code = this.getQueryParam(location, 'code');
    const state = this.getQueryParam(location, 'state');      
    const qeuryObj = {code, state};
    this.router.navigate( [`../${ROUTE_DATA.GET_TOKENS}` ], { queryParams: qeuryObj, relativeTo: this.route});
}

  
private getQueryParam(url: string, key: string): string | null {
   const match = url.match(new RegExp(`[?&]${key}=([^&]+)`));
   return match ? decodeURIComponent(match[1]) : null;
   }
 }
 



