import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { I18n } from '@proteo/i18n-utils';
import { OtpComponent } from './otp.component';
import { ReactiveFormsModule } from '@angular/forms';
import { initialize } from '@proteo/data-manager';
import { ActivatedRoute, Router } from '@angular/router';
import { ROUTE_DATA } from '@app/login/domain/constants/path.constant';
import { OtpEvent } from '@app/login/domain/models/otp.model';
import { CALLBACK_PROPS_ENUM } from '@app/login/domain/constants/callbacks.enum';
import { LOGIN_DATA_FIELDS } from '@app/login/domain/models/login-data.model';
import { ISuccessOtpRespone, TreeCallbackModel } from '@app/login/domain/models/Tree-callback.model';
import { MessageService } from '@app/login/application/services/message.service';
import { GetLoginDataInfo } from '@app/login/domain/use-cases/get-login-data-info.usecase';
import { TranslateService } from '@proteo/ng-translate';
import { of, throwError } from 'rxjs';
import { mockActivatedRoute } from '@app/login/domain/mocks.constants';
import { RetryTime } from '@app/login/domain/constants/login.data.constant';
import { LOGIN_EVENTS } from '@app/login/domain/constants/event.enum';
import { TealiumTraceLoginService } from '@app/login/application/services/tealium-trace-login.service';
import { LINK_NAMES, OP_STEPS, STEPS, TealiumEventDataLogin } from '@app/login/domain/constants/global.constants';
import { HttpErrorResponse } from '@angular/common/http';

describe('OtpComponent', () => {
  let fixture: ComponentFixture<OtpComponent>;
  let component!: OtpComponent

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [OtpComponent, ReactiveFormsModule],
      providers: [
        { provide: TealiumTraceLoginService, useValue: jasmine.createSpyObj("TealiumTraceLoginService", [
          "sendLoginPageTealiumTrace", "sendLoginTealliumTagEvent"
        ])
        },
         MessageService, GetLoginDataInfo, TranslateService,
        {
          provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate'])
        },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    I18n.initInstance();
    fixture = TestBed.createComponent(OtpComponent);
    component = fixture.componentInstance;

    await initialize({
      PARTY_AUTHENTICATION: {
        HOST: 'http://localhost:4200/proxy',
        BASE_PATH: '/',
        DRIVER: 'HTTP'
      }
    });
    fixture.detectChanges();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('On Init', () => {
    component.ngOnInit();
    expect(component.tealiumTraceService.sendLoginPageTealiumTrace).
    toHaveBeenCalledWith(  
            LINK_NAMES['OPERATIVA_FIRMA'], STEPS['FIRMA'], OP_STEPS['FIRMA']
      
    )
  })

  it('validate', () => {
    const mockCode = '654321';
    component.code.set(mockCode)
    spyOn(component, 'submitOtp');
    component.validate()
    expect(component.submitOtp).toHaveBeenCalledOnceWith(mockCode);
  });

  it('clearErrorPage', () => {
    component.clearErrorPage()
    expect(component.error()).toBeFalse();
  });

  it('reSendCode', async () => {
    spyOn(component, 'submitOtp');
    await component.reSendCode()
    expect(component.submitOtp).toHaveBeenCalledWith("-");
  });

  it('validateAndFill', () => {
    const mockCode = '222222';
    component['validateAndFill'](mockCode)
    expect(component.isValid()).toBeTrue();
    expect(component.code()).toEqual(mockCode);
  });

  it('goToLogin', () => {
    component.goToLogin()
    expect(component.router.navigate).toHaveBeenCalledWith([`../${ROUTE_DATA.LOGIN}`], {relativeTo:component.route});
  });

  it('resetCountdown', () => {
    spyOn(component as never, 'startCountdown')
    component['resetCountdown']()
    expect(component.countdown()).toEqual(RetryTime);
    expect(component['startCountdown']).toHaveBeenCalled();
    expect(component.allowRetry()).toBeFalse();
  });

  it('startCountdown', fakeAsync(() => {
    component.countdown.set(1);
    component['startCountdown']()
    tick(1000)
    expect(component.countdown()).toEqual(0);
    expect(component.allowRetry()).toBeTrue();
    flush()
  }));


  it('should call getDriver on submitFormFull with correct response', async () => {
    const mockAuthId = '12342134234';
    const mockPhone = '+34666888999';
    const mockCode = '123456'


    component.loginDataService.setLoginData({
      [LOGIN_DATA_FIELDS.DOCUMENT]: '123141',
      [LOGIN_DATA_FIELDS.PHONE]: mockPhone,
      [LOGIN_DATA_FIELDS.OTP]: mockCode,
      [LOGIN_DATA_FIELDS.AUTH_ID]: mockAuthId
    })

    const mockBodyResponse =
      {
        authId: mockAuthId,
        callbacks: [
          {
            type: CALLBACK_PROPS_ENUM.META_DATA_CALLBACK,
            output: [
              {
                name: CALLBACK_PROPS_ENUM.DATA,
                value: {}
              }
            ],
            _id: 0
          },
          {
            type: CALLBACK_PROPS_ENUM.PASSWORD_CALL_BACK,
            input: [{ name: CALLBACK_PROPS_ENUM.ID_TOKEN_2, value: mockCode }],
            output: [{ name: CALLBACK_PROPS_ENUM.PROMPT, value: CALLBACK_PROPS_ENUM.ONE_TIME_PASSWORD }],
            _id: 1

          }
        ],
        stage: CALLBACK_PROPS_ENUM.VALIDATE_SMS
      } as TreeCallbackModel & ISuccessOtpRespone;

    spyOn(component.getLoginDataInfo, 'execute').and.returnValue(of(mockBodyResponse));
    spyOn(component.messgeService, 'handleError').and.callThrough();

    component.loginDataService.setOTPData(mockCode);
    await component.submitOtp(component.code());
    expect(component.getLoginDataInfo.execute).toHaveBeenCalledWith({
      [LOGIN_DATA_FIELDS.OTP]: component.code(),
      [LOGIN_DATA_FIELDS.CALL_MODE]: 'OTP',
      [LOGIN_DATA_FIELDS.AUTH_ID]: mockAuthId
    })
  });

  it('should call getDriver on submitFormFull with correct response TWO', async () => {
    const mockAuthId = '12342134234';
    const mockPhone = '+34666888999';
    const mockCode = '1234123'


    component.loginDataService.loginData.set({
      [LOGIN_DATA_FIELDS.DOCUMENT]: '123141',
      [LOGIN_DATA_FIELDS.PHONE]: mockPhone
    })
    const mockBodyErrorResponse =
      {
        authId: mockAuthId,
        callbacks: [
          {
            type: CALLBACK_PROPS_ENUM.META_DATA_CALLBACK,
            output: [
              {
                name: CALLBACK_PROPS_ENUM.DATA,
                value: {
                  errorCode: "WRONG_OTP_CODE"
                }
              }
            ],
            _id: 0
          },
          {
            type: CALLBACK_PROPS_ENUM.PASSWORD_CALL_BACK,
            input: [{ name: CALLBACK_PROPS_ENUM.ID_TOKEN_1, value: mockCode }],
            output: [{ name: CALLBACK_PROPS_ENUM.PROMPT, value: CALLBACK_PROPS_ENUM.ONE_TIME_PASSWORD }],
            _id: 1

          }
        ],
        stage: CALLBACK_PROPS_ENUM.VALIDATE_SMS
      } as TreeCallbackModel & ISuccessOtpRespone;

    spyOn(component.getLoginDataInfo, 'execute').and.returnValue(of(mockBodyErrorResponse));


    await component.submitOtp('123123');
    expect(component.isValid()).toBeFalse();
  });

  it('submitOtp - success', async () => {

    const mockCode = '345354'
    const mockResponseCall: ISuccessOtpRespone = {
      successUrl: 'success/url',
      realm: 'mockRealm',
      tokenId: '12312312312'
    }

    spyOn(component.getLoginDataInfo, 'execute').and.returnValue(of(mockResponseCall));
    spyOn(component.loginDataService, 'setSuccessData')
    fixture.whenStable();
    await component.submitOtp(mockCode);
    expect(component.loginDataService.setSuccessData).toHaveBeenCalledOnceWith(mockResponseCall)

  })

  it('submitOtp - Error 500', async () => {


    spyOn(component.getLoginDataInfo, 'execute').and.returnValue(throwError( () => new HttpErrorResponse({ status: 500}))
    );
    spyOn(component.publishService, 'publishEvent')
    fixture.whenStable();
    await component.submitOtp("123412");
    expect(component.publishService.publishEvent).toHaveBeenCalledOnceWith(LOGIN_EVENTS.ERROR)

  })

  it('submitOtp - Error 400', async () => {

    const mockError: HttpErrorResponse =  new HttpErrorResponse({ status: 401, error: "401 Error"})
    spyOn(component.getLoginDataInfo, 'execute').and.returnValue(throwError( () => mockError)
    );
    spyOn(component.messgeService, 'handleError')
    fixture.whenStable();
    await component.submitOtp("123412");
    expect(component.messgeService.handleError).toHaveBeenCalledWith(mockError)

  })


  
  it('submitOtp - hyphon', async () => {

    const mockCode = '-';
    spyOn(component as any, 'resetCountdown')
    fixture.whenStable();
    await component.submitOtp(mockCode);
    expect(component['resetCountdown']).toHaveBeenCalled()

    }
    );

  it('initializeotpBoxElement and validates success', () => {
    spyOn(component as never, 'validateAndFill')
    const mockCode = '555555'
    const event = new CustomEvent('bsOtpBoxChanges',
      { detail: { valid: true, code: mockCode as keyof OtpEvent } as OtpEvent })
    fixture.detectChanges();
    component.bsOtpBoxChangesEvent(event)

    expect(component.isValid()).toBeFalse()
  })

  it('initializeotpBoxElement and validates error', () => {
    const mockCodeError = '5555'
    const event = new CustomEvent('bsOtpBoxChanges',
      { detail: { valid: false, code: mockCodeError } })
    
    component.bsOtpBoxChangesEvent(event)

    expect(component.isValid()).toBeFalse()
  })

  it("clickHelp", () => {
    spyOn(component.publishService, "publishEvent").and.callThrough();
    component.clickHelp();

    expect(component.code()).toEqual("");
    expect(component.publishService.publishEvent).toHaveBeenCalledWith(LOGIN_EVENTS.HELP);
    expect(component.tealiumTraceService.sendLoginTealliumTagEvent)
    .toHaveBeenCalledWith(TealiumEventDataLogin.TITLE, TealiumEventDataLogin.ACTION['HELP'])
  })

  it("eventClick", () => {
    spyOn(component, "goToLogin")
    component.eventClick();
    expect(component.goToLogin).toHaveBeenCalled()
  })


});
