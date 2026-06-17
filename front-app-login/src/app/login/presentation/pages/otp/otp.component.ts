import { CommonModule } from '@angular/common';
import { AfterViewInit, CUSTOM_ELEMENTS_SCHEMA, Component, ElementRef, EventEmitter, OnInit, Output, ViewChild, WritableSignal, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LoaderComponent } from '../../shared/loader.component';
import { TreeCallbackModel } from '@app/login/domain/models/Tree-callback.model';
import { ActivatedRoute, Router } from '@angular/router';
import { OtpEvent } from '@app/login/domain/models/otp.model';
import { LoginDataService } from '@app/login/application/services/login-data.service';
import { ROUTE_DATA } from '@app/login/domain/constants/path.constant';
import { TranslatePipe, TranslateService } from '@proteo/ng-translate';
import { LoginTranslationService } from '@app/login/application/services/login-translation.service';
import { PublishService } from '@app/login/application/services/publish.service';
import { LOGIN_EVENTS } from '@app/login/domain/constants/event.enum';
import { LOGIN_DATA_FIELDS } from '@app/login/domain/models/login-data.model';
import { GetLoginDataInfo } from '@app/login/domain/use-cases/get-login-data-info.usecase';
import { LoginDataInfoRepository } from '@app/login/domain/repositories/login-data-info.repository';
import { InfoLoginDataBackendRepository } from '@app/login/infrastructure/backend/login-data-info-backend.repository';
import { MessageService } from '@app/login/application/services/message.service';
import { HttpErrorResponse } from '@angular/common/http';
import { RetryTime } from '@app/login/domain/constants/login.data.constant';
import { TealiumTraceLoginService } from '@app/login/application/services/tealium-trace-login.service';
import { LINK_NAMES, OP_STEPS, STEPS, TealiumEventDataLogin } from '@app/login/domain/constants/global.constants';

@Component({
  selector: 'bs-otp',
  standalone: true,
  imports: [CommonModule, FormsModule, LoaderComponent, ReactiveFormsModule, TranslatePipe],
  providers: [TranslateService, MessageService,
    GetLoginDataInfo,
    { provide: LoginDataInfoRepository, useClass: InfoLoginDataBackendRepository }

  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  styles: `
    :host {
      .full-screen-width {
        width: 100vw;
        left: calc(-50vw + 50%);
        position: relative;
        @media (min-width: 769px) {
          padding: 0px 56px 0px 56px;
        }
      }
      .margin-custom {
        &-bottom {
          margin-bottom: 24px;
        }  
        @media (min-width: 769px) {
          &-top {
            margin-top: 32px;
          }
          &-bottom {
            margin-bottom: 32px;
          }  
        }
      }  
      .otp-box-container {     
        background: #FFFFFF;
        padding: 24px 16px;
        box-shadow: 0 4px 5px 0 rgba(0,0,0,0.1), 0 1px 10px 3px rgba(0,0,0,0.05), 0 2px 4px -5px rgba(0,0,0,0.06);      
        border-radius: 16px;
        @media (max-width: 480px) {
          padding: 24px 8px;
        }
        &-title {
          margin-bottom: 24px;
        }
        max-width: 536px;
        min-width: 328px;
        margin: auto;
      }
      .center-logo {
        padding-left: 16px;
        @media (max-width: 768px) {
          padding-left: 0px;
          display: flex;
          justify-content: center;
        }    
      }  
      .mobile-control {
          display: inline-flex;
          flex-direction: column;
          width: 100%;
          .resend-link {
            margin-top: 16px
          }
          @media (min-width: 769px) {
            flex-direction: row;
            flex: 1;
            flex-basis: 100%;
            .resend-link {
              margin-top: revert;
              margin-left: 24px;
            }
          }
      }
      @media (min-width: 769px) {
        .title-box {
          padding-left: 108px;
          padding-right: 108px;
        }
      }  
    }
  `,
  template: `
    <bs-section class="no-margin no-gutters"> 
      <bs-row class="no-margins no-gutters full-screen-width">          
        <bs-col size--1-1 class="pt-sm center-logo">
          <bs-logo color="colored" size="xs"></bs-logo>
        </bs-col>         
        <bs-status-bar class="margin-custom-bottom" show-text-close="true" type="full-screen"
          (bsStatusBarCloseClick)="eventClick()"></bs-status-bar> 
      </bs-row>   
      <bs-row class="title-box no-margins no-gutters"> 
        <bs-col size--1-1 class="margin-custom-top margin-custom-bottom pl-sm pr-sm">
          <bs-title size="md" class="strong mb-xxxs align-left">
          {{ getTranslation('login:APP.OTP_STEP.TITLE')}}
          </bs-title>
          <bs-text class="size-md align-left">
          {{ getTranslation('login:APP.OTP_STEP.DESCRIPTION')}}
          </bs-text>
        </bs-col>
        <bs-col size--1-1 class="mb-md pl-sm pr-sm">
          <div class='otp-box-container'>
            <bs-title size="xs" class="align-center otp-box-container-title semibold"
            feedback-type="info">
              {{ getTranslation('login:APP.OTP_STEP.CODE_INFO')}}
            </bs-title>
            <bs-otp-input  
            #otpInput
            (bsOtpChanges)="bsOtpBoxChangesEvent($event)"
              type=WRITE
              code="{{code()}}"
              quantityNumbers=6
              writeHelper="{{ getTranslation('login:APP.OTP_STEP.CODE_HELPER')}}"
              required
              validate></bs-otp-input>
          </div>
        </bs-col>
        <bs-col size--1-1>
          <bs-text class="size-md color-grey align-center helper-text align-center">
            {{ getTranslation('login:APP.COMMON.HELP') }}
          <bs-link (bsLinkClick)="clickHelp()" target="_self" class="tertiary size-md no-margin no-padding">
            {{ getTranslation('login:APP.OTP_STEP.HELP_LINK') }}
          </bs-link>
          </bs-text>
        </bs-col>
      </bs-row>
      <bs-row style="position: fixed; bottom: 0;" class="no-margins no-gutters full-screen-width">
        <bs-sticky-panel opened-by-default>
          <div class="mobile-control">
            <bs-button (bsButtonClick)="validate()" class="primary size-md" [disabled]="!isValid()">
              {{ getTranslation('login:APP.OTP_STEP.CODE_VALIDATE')}}
            </bs-button>
            <bs-button [disabled]="!allowRetry()" target="_self" (bsButtonClick)="reSendCode()" class="resend-link tertiary size-md align-center">         
              @if(countdown() > 0) { {{ 'login:APP.OTP_STEP.CODE_RESEND_IN' | translate: { count: countdown() } }}
              } @else { {{ getTranslation('login:APP.OTP_STEP.CODE_RESEND') }} }
            </bs-button>
          </div>          
        </bs-sticky-panel>
      </bs-row>
  </bs-section>
  `
})
export class OtpComponent implements OnInit, AfterViewInit {

  /**
   * galatea component that displays the otp box
   */
  @ViewChild('otpInput', { read: ElementRef }) otpInput!: ElementRef



  /**
   * signal that handles the loading section dinamyc view
   */
  loading: WritableSignal<boolean> = signal(false);

  /**
   * signal that handles the loading section dinamyc view
   */
  error: WritableSignal<boolean> = signal(false);

  /**
   * signal which handles the disable state of send code button
   */
  isValid: WritableSignal<boolean> = signal(false);

  /**
   * signal that feeds the code inserted in the otpboxx
   */
  code: WritableSignal<string> = signal("");

  /**
   * signal which handles the resend code link
   */
  allowRetry: WritableSignal<boolean> = signal(false)

  /**
   * member which Counts the timer down so that allows to enable send Code link
   */
  countdown = signal(RetryTime);

  /**
   * Output of login event response
   */
  @Output() loginResponse = new EventEmitter();

  /**
   * Output of login need help button
   */
  @Output() loginHelp = new EventEmitter();


  /**
   * angular router
   */
  router!: Router;

  /**
   * service which stores and handle everything related to login state
   */
  loginDataService!: LoginDataService;

  loginTranslationService: LoginTranslationService;

  ef: ElementRef;

  publishService: PublishService;

  getLoginDataInfo: GetLoginDataInfo;

  messgeService: MessageService;

  route!: ActivatedRoute
  count!: number;
  tealiumTraceService: TealiumTraceLoginService;

  constructor() {
    this.router = inject(Router);
    this.route = inject(ActivatedRoute);
    this.messgeService = inject(MessageService);
    this.ef = inject(ElementRef);
    this.publishService = inject(PublishService);
    this.loginDataService = inject(LoginDataService);
    this.loginTranslationService = inject(LoginTranslationService);
    this.getLoginDataInfo = inject(GetLoginDataInfo);
    //this.otpInput = this.ef.nativeElement.querySelector('bs-otp-input');
    this.tealiumTraceService = inject(TealiumTraceLoginService);
    if(this.loginDataService.getCurrentAuthId() ==='') this.router.navigate([`/${ROUTE_DATA.ROOT}`]);
    this.startCountdown();
  }
  ngOnInit(): void {
    this.tealiumTraceService.sendLoginPageTealiumTrace(
      LINK_NAMES['OPERATIVA_FIRMA'], STEPS['FIRMA'], OP_STEPS['FIRMA']
    )
  }

  /**
   * hook cycle method
   */
  ngAfterViewInit() {
    this.translateBsResult();
  }

  /**
   * call back otp code
   */
  validate() {
    this.submitOtp(this.code())
  }


  /**
   * hides the error template section
   */
  clearErrorPage() {
    this.error.set(false)
  }

  /**
   * initiates the resend code state
   */
  reSendCode() {
    this.code.set("");
    // this.otpInput?.nativeElement.setValidationState("success")
    this.submitOtp("-")
  }

  /**
   * redirects to login page
   */
  goToLogin() {
    this.publishService.publishEvent(LOGIN_EVENTS.FOOTER, false)
    this.router.navigate([`../${ROUTE_DATA.LOGIN}`], { relativeTo: this.route })
  }

  /**
   * Sends Event shell that trigger help modal
   */
  async clickHelp() {
    this.publishService.publishEvent(LOGIN_EVENTS.HELP);
    this.tealiumTraceService.sendLoginTealliumTagEvent(TealiumEventDataLogin.TITLE, TealiumEventDataLogin.ACTION['HELP'])

  }


  /**
   * Actions the post call wiht the authId and the populated object
   * @param code CTA sends otp code
   */
  async submitOtp(code: string) {
    if (code === "-") this.resetCountdown()
    this.getLoginDataInfo.execute(
      {
        [LOGIN_DATA_FIELDS.OTP]: code,
        [LOGIN_DATA_FIELDS.AUTH_ID]: this.loginDataService.getCurrentAuthId(),
        [LOGIN_DATA_FIELDS.CALL_MODE]: 'OTP'
      }).subscribe(
        {
          next: (response) => {
           if (response?.successUrl !== undefined && code !== "-") {
              this.loginDataService.setSuccessData(response);
              this.router.navigate([`../${ROUTE_DATA.SUCCESS}`], { relativeTo: this.route })
            } else {
              const errorMessage = this.loginDataService.getError(response as TreeCallbackModel);
              const otpBoxElement = this.otpInput?.nativeElement
              if (otpBoxElement && otpBoxElement.setValidationState && code !=="-") otpBoxElement.setValidationState('error', errorMessage);
              this.isValid.set(false)
            }
          },
          error: (error: HttpErrorResponse) => {
            if (error.status > 499) {
              this.publishService.publishEvent(LOGIN_EVENTS.ERROR)
            } else {
              this.messgeService.handleError(error)
            }
          },
          complete: () => this.loading.set(false)
        }
      )
  }

  eventClick() {
    this.goToLogin()
  }

  getTranslation(key: string) {
    return this.loginTranslationService.translateFromKey(key)
  }

  bsOtpBoxChangesEvent(e: Event) {
    e.preventDefault();
    if (e instanceof CustomEvent //detects the galatea defined event
      && e.detail as OtpEvent // wee ned 'code' and 'valid' properties
      && e.detail.valid as keyof OtpEvent // true when the box has been successfully fullfilled
    ) {
      this.validateAndFill(e.detail.code);
    } else {
      this.isValid.set(false)
    }
  }

  /**
   * feeds code to code property and enables button
   * @param code otp vode value
   */
  private validateAndFill(code: string) {
    this.isValid.set(true)
    this.code.set(code)
  }

  /**
   * starts the coundown timer, matched with disabled-enabled attr of the 'resend code' link
   */
  private startCountdown() {
    const intervalId = setInterval(() => {
      this.countdown.update(count => {
        this.count = count;
        return count - 1
      });
      if (this.countdown() === 0) {
        clearInterval(intervalId);
        this.allowRetry.set(true)
      }
    }, 1000);
  }

  /**
   * initiates the coundown state: statts timer from 60' and disables link
   */
  private resetCountdown() {
    this.allowRetry.set(false)
    this.countdown.set(RetryTime);
    this.startCountdown();

  }

  private translateBsResult() {
    const bsResult = this.ef.nativeElement.querySelector('bs-result');
    if (bsResult) {
      bsResult.titleMessage = this.getTranslation('login:APP.STATIC_PAGE.ERROR.TITLE')
    }
  }
}

