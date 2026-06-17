import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, Component, ElementRef, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MessageService } from '@app/login/application/services/message.service';
import { BUTTON_ACTION  } from '@app/login/domain/models/message-scr-conf.model';
import { ROUTE_DATA } from '@app/login/domain/constants/path.constant';
import { PublishService } from '@app/login/application/services/publish.service';
import { LOGIN_EVENTS } from '@app/login/domain/constants/event.enum';
import { LoginTranslationService } from '@app/login/application/services/login-translation.service';

@Component({
  selector: 'bs-error',
  standalone: true,
  imports: [CommonModule, RouterModule],
  providers: [MessageService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <bs-section style="margin: 0 auto">   
      <bs-row class="no-margins no-gutters full-screen-width">          
        <bs-col size--1-1 class="pt-sm center-logo">
          <bs-logo color="colored" size="xs"></bs-logo>
        </bs-col>         
        <bs-status-bar [showLevelNBackButton]="false" type="level-n" ></bs-status-bar> 
      </bs-row>  
      <bs-row class="no-margins no-gutters">
        <bs-col size--1-1>
          <bs-result [titleMessage]="getTranslation('login:APP.STATIC_PAGE.ERROR.TITLE')" type="error" show-footer="false">
            <div slot="descriptions" style="width: 100%">
              <bs-text class="mb-xxxl size-md">{{getTranslation('login:APP.STATIC_PAGE.ERROR.DESCRIPTION')}}</bs-text>
            </div>
              <div slot="buttons" style="width: 100%;">
                <bs-buttons-set class="stack" style="width: 100%;">
                  <bs-button class="primary size-md " (bsButtonClick)="retry()">
                    {{getTranslation('login:APP.STATIC_PAGE.ERROR.RESEND_CTA')}}
                  </bs-button>
                  <bs-button (bsButtonClick)="clickHelp()" icon-kind="outline"  icon-name="assistant-alt" class="tertiary size-md composed"> 
                  {{getTranslation('login:APP.COMMON.HELP')}}
                  </bs-button>
                </bs-buttons-set>                
            </div> 
          </bs-result>
        </bs-col>
      </bs-row>
    </bs-section>
  `,
  styles: [`
    :host { 
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
  `]
})

export class ErrorComponent {
  private router: Router;
  messageService: MessageService;
  publishService: PublishService;
  loginTranslationService: LoginTranslationService;
  ef: ElementRef = inject(ElementRef)

  

  constructor() {
    this.router = inject(Router);
    this.messageService = inject(MessageService);
    this.publishService = inject(PublishService);
    this.loginTranslationService = inject(LoginTranslationService);
  }

    /**
     * 
     * @param event displays message compoennt and sets configuration of it
     */
    handleMessageAction(event:BUTTON_ACTION) {
      switch (event) {
        case BUTTON_ACTION.RETRY:
          this.publishService.publishEvent(LOGIN_EVENTS.FOOTER, true) 
          this.router.navigate([`./${ROUTE_DATA.LOGIN}`])
          break;
          case BUTTON_ACTION.HELP:
            this.clickHelp() 
            break;
        default:  
          break;
      }
    }

    retry(){
      this.publishService.publishEvent(LOGIN_EVENTS.FOOTER, true) 
      this.router.navigate([`./${ROUTE_DATA.LOGIN}`])
    }

    /**
     * Translate the texts of the template
     * @param key key of the translation file object
     * @returns 
     */
    getTranslation(key: string) {
      return this.loginTranslationService.translateFromKey(key)
    }

   /**
   * publishes open help modal event to shell app
   */
    async clickHelp() {
      await this.publishService.publishEvent(LOGIN_EVENTS.HELP);
    }  
}
