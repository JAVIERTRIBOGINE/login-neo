import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, Component, ElementRef, InjectionToken, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoginTranslationService } from '../application/services/login-translation.service';
import { initialize, isAuthInitialized, endSession,  revoke} from '@proteo/authorization-utils';
import { PROTEO_APP_CONF } from '@proteo/ng-bootstrap';
import { ExtendedAppConfig } from '../domain/models/app-config.model';
import { AuthConfig } from '@proteo/types';
import { getTokens, authorize } from '../application/services/utils';
import { AUTHORIZE_FN, CHANEL_DEFAULT, END_SESSION_FN, GET_TOKENS_FN, INITIALIZE_FN, REVOKE_FN } from '../domain/constants/global.constants';
import { LoginDataService } from '../application/services/login-data.service';




@Component({
  selector: 'login-page',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, RouterOutlet],
  providers:[
    {
      provide: GET_TOKENS_FN,
      useValue: getTokens
    },
    {
      provide: INITIALIZE_FN,
      useValue: initialize
    },
    {
      provide: AUTHORIZE_FN,
      useValue: authorize
    },
    {
      provide: END_SESSION_FN,
      useValue: endSession
    },
    {
      provide: REVOKE_FN,
      useValue: revoke
    },
  ],
  template: 
    `
       <router-outlet></router-outlet>
    `,
  styles: [
    `.container { 
        margin: 10px 5px;
        position: relative;
        .watermark::after {
            content: "Dev";
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 3em;
            color: rgba(0, 0, 0, 0.1);
            pointer-events: none;
        }
      } 
    `
  ]
})  
export class LoginPageComponent implements OnInit {
  ef = inject(ElementRef);
  private authData: ExtendedAppConfig   = inject(PROTEO_APP_CONF as InjectionToken<ExtendedAppConfig>);
  initialize = inject(INITIALIZE_FN);
  isAuthInitialized = isAuthInitialized;
  loginDataService = inject(LoginDataService)
  loginTranslate = inject(LoginTranslationService);
  


  ngOnInit(): void {
    this.loginDataService.setProcedence(this.authData?.CUSTOM_CONFIG?.['ORIGIN_APP'] || "")
    this.loginDataService.setTealiumChannel(this.authData?.CUSTOM_CONFIG?.['CANAL_TEALIUM'] || CHANEL_DEFAULT)
    this.initializing()
  }

   

  initializing(){
    if (!this.isAuthInitialized()) {
      this.initialize(this.authData.AUTH_CONFIG as AuthConfig  );
    }

  
  }
}
