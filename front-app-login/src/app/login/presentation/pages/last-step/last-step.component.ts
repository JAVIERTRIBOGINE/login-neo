import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, Component, ElementRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@proteo/ng-translate';
import { MessageService } from '@app/login/application/services/message.service';
import { PublishService } from '@app/login/application/services/publish.service';
import { ROUTE_DATA } from '@app/login/domain/constants/path.constant';
import { LOGIN_EVENTS } from '@app/login/domain/constants/event.enum';
import { LoginDataService } from '@app/login/application/services/login-data.service';
import { TealiumTraceLoginService } from '@app/login/application/services/tealium-trace-login.service';
import { LINK_NAMES, STEPS, OP_STEPS } from '@app/login/domain/constants/global.constants';
import { timer } from 'rxjs/internal/observable/timer';
import { takeUntil } from 'rxjs';
import { LoginTranslationService } from '@app/login/application/services/login-translation.service';

@Component({
  selector: 'bs-last-step',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, RouterOutlet, TranslatePipe],
  providers: [MessageService],
  template: `
  <bs-section style="no-margin no-gutters">
    <bs-row class="no-margins no-gutters full-screen-width">          
      <bs-col size--1-1 class="pt-sm center-logo">
        <bs-logo color="colored" size="xs"></bs-logo>
      </bs-col>         
      <bs-status-bar [showLevelNBackButton]="false" type="level-n"></bs-status-bar> 
    </bs-row>  
    <bs-row class="no-margins no-gutters">
      <bs-col size--1-1>
        <bs-result type="success" [titleMessage]="getTranslation('login:APP.STATIC_PAGE.SUCCESS.TITLE')" show-footer="false" >
          <div slot="descriptions" style="width: 100%">
            <bs-text class="size-md">{{getTranslation('login:APP.STATIC_PAGE.SUCCESS.DESCRIPTION')}}</bs-text>
          </div>
        </bs-result>
      </bs-col>
    </bs-row>
  </bs-section>
  `,
  styles: 
  `:host {
    .full-screen-width {
      width: 100vw;
      left: calc(-50vw + 50%);
      top: 0;
      position: absolute;
      @media (min-width: 769px) {
        padding: 0px 56px 0px 56px;
      }
    }
    .center-logo {
      padding-left: 16px;
      @media (max-width: 768px) {
        padding-left: 0px;
        display: flex;
        justify-content: center;
      }    
    }  
   }
  `
})
export class LastStepComponent implements OnInit {
  messageService: MessageService;
  publishService: PublishService
  router: Router;
  route: ActivatedRoute;
  loginDataService: LoginDataService;
  tealiumTraceService: TealiumTraceLoginService;
  loginTranslationService: LoginTranslationService;
  ef: ElementRef
  
  constructor() {
    this.ef = inject(ElementRef)
    this.tealiumTraceService = inject(TealiumTraceLoginService)
    this.messageService = inject(MessageService);
    this.route = inject(ActivatedRoute)
    this.router = inject(Router);
    this.loginTranslationService = inject(LoginTranslationService);
    
    this.loginDataService = inject(LoginDataService);
    this.publishService = inject(PublishService);
  }

  ngOnInit(): void {
    this.tealiumTraceService.sendLoginPageTealiumTrace(
      LINK_NAMES['OPERATIVA_CONFIRMACION'], STEPS['CONFIRMACION'], OP_STEPS['CONFIRMACION']
    )
   this.handleTimer()
  }

  getTranslation(key: string) {
    return this.loginTranslationService.translateFromKey(key)
  }

  openHelpModal(){
    this.publishService.publishEvent(LOGIN_EVENTS.HELP)
  }

  authorizeSession(){
    this.router.navigate([`../${ROUTE_DATA.AUTHORIZE}`], { relativeTo: this.route });
  }

  handleTimer(){    
    const source$ = timer(0, 1000); 
    const stop$ = timer(3000);    

    source$
      .pipe(takeUntil(stop$))
      .subscribe({complete: () => this.router.navigate([`../${ROUTE_DATA.AUTHORIZE}`], { relativeTo: this.route }) });
  }
}
