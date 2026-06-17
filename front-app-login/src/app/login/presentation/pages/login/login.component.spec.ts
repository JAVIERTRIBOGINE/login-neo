import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { ReactiveFormsModule } from '@angular/forms';
import { initialize } from '@proteo/data-manager';
import { DocumentValidation } from '@proteo/validation-utils';
import { PublishService } from '@app/login/application/services/publish.service';
import { LOGIN_EVENTS } from '@app/login/domain/constants/event.enum';
import { ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LoginTranslationService } from '@app/login/application/services/login-translation.service';
import { LOGIN_DATA_FIELDS } from '@app/login/domain/models/login-data.model';
import { MessageService } from '@app/login/application/services/message.service';
import { GetLoginDataInfo } from '@app/login/domain/use-cases/get-login-data-info.usecase';
import { of, throwError } from 'rxjs';
import { ISuccessOtpRespone, TreeCallbackModel } from '@app/login/domain/models/Tree-callback.model';
import { mockActivatedRoute } from '@app/login/domain/mocks.constants';
import { TealiumTraceLoginService } from '@app/login/application/services/tealium-trace-login.service';
import { TeliumTraceDataLogin } from '@app/login/domain/constants/global.constants';
import { StorageManager } from '@proteo/storage-utils';



describe('LightLoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let mockPhone!: ElementRef;
  let mockDocument!: ElementRef;
  let loginTranslationService: jasmine.SpyObj<LoginTranslationService>;

  beforeEach(async () => {
    mockPhone = new ElementRef('bs-input-phone')
    const mockNativeElement = document.createElement('bs-input');
    mockNativeElement.dispatchEvent = jasmine.createSpy('dispatchEvent');
    const loginTranslationSpy = jasmine.createSpyObj('LoginTranslationService', ['getLanguage','translateFromKey']);
    
    mockDocument = new ElementRef(mockNativeElement)
    TestBed.configureTestingModule({
      providers: [
        MessageService, GetLoginDataInfo,
        {provide: LoginTranslationService, 
          useValue: loginTranslationSpy
         },
        { provide: TealiumTraceLoginService, useValue: jasmine.createSpyObj("TealiumTraceLoginService", [
            "sendLoginPageTealiumTrace", "sendLoginTealliumTagEvent"
          ])
        },
        {
          provide: PublishService,
          useValue: jasmine.createSpyObj('PublishService',
             ['publishEvent'])},
        {provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate'])},
        {provide: ActivatedRoute, useValue: mockActivatedRoute}
      ],
      imports: [LoginComponent, ReactiveFormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    component.documentNumber = mockDocument;
    component.inputPhone = mockPhone;
    loginTranslationService = TestBed.inject(LoginTranslationService) as jasmine.SpyObj<LoginTranslationService>;
  
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
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('On Init', () => {
    const {NOMBRE_LINK, PASO, PASO_OPERATIVA} = TeliumTraceDataLogin
    StorageManager.getInstance().set('imglg','test');
    component.ngOnInit();
    expect(component.tealiumService.sendLoginPageTealiumTrace).
    toHaveBeenCalledWith(  NOMBRE_LINK, PASO, PASO_OPERATIVA)
  })

  it('should emit loginHelp on help button click', async() => {
      await component.clickHelp();
      expect(component.publishService.publishEvent).toHaveBeenCalledOnceWith(
        LOGIN_EVENTS.HELP
      )
    });

  it('should call getDriver on submitFormFull with correct response', async () => {

    const mockResponse = {
        authId: '',
        callbacks: [
          {
            type: 'NameCallback',
            output: [{ name: 'prompt', value: 'Introduce tu documento' }],
            input: [{ name: 'IDToken1', value: '' }]
          },
          {
            type: 'TextInputCallback',
            output: [{ name: 'prompt', value: 'Introduce tu teléfono' }],
            input: [{ name: 'IDToken2', value: '' }]
          }
        ]
      } as TreeCallbackModel & ISuccessOtpRespone;

    spyOn(component.getLoginDataInfo, 'execute').and.returnValue(of(mockResponse));
    spyOn(component.messageService, 'handleError').and.callThrough();

    
    component.documentNumber.nativeElement.value ='43734794h';
    component['phoneCode'].set('600123456');
    component['dialCode'].set('+34');
    await component.submitFormFull();
    expect(component.getLoginDataInfo.execute).toHaveBeenCalledWith({
            [LOGIN_DATA_FIELDS.PHONE]: '+34-600123456'  ,
            [LOGIN_DATA_FIELDS.DOCUMENT]: '43734794h',
            [LOGIN_DATA_FIELDS.CALL_MODE]: 'LOGIN'
          })

  });

  it('should call getDriver on submitFormFull with error response 401', async () => {
    const error = new HttpErrorResponse({
      status: 401,
      error:'Unauthorized',
      url: 'test-url'},
    );
        
    component.documentNumber.nativeElement.value ='43734794h';
    component.inputPhone.nativeElement.value = '600123456';
    spyOn(component.getLoginDataInfo, 'execute').and.returnValue( throwError(()=>
      error
    ));
    spyOn(component.messageService, 'handleError').and.callThrough();

    await component.submitFormFull();
    expect(component.messageService.handleError).toHaveBeenCalledWith(error);
  });

  it('should call getDriver on submitFormFull with error response 500', async () => {
    const error = new HttpErrorResponse({
      status: 500,
      error:'Server',
      url: 'test-url'},
    );
        
    component.documentNumber.nativeElement.value ='43734794h';
    component.inputPhone.nativeElement.value = '600123456';
    spyOn(component.getLoginDataInfo, 'execute').and.returnValue( throwError(()=>
      error
    ));

    await component.submitFormFull();
    expect(component.publishService.publishEvent).toHaveBeenCalledWith(LOGIN_EVENTS.ERROR);
  });

  it('should document validation when change input', () => {
    const documentSpyOn = jasmine.createSpyObj(DocumentValidation, ['isValidDocument']);
    const spy = spyOn(DocumentValidation, 'isValidDocument').and.returnValue(documentSpyOn);

    component.userValidationRules[0]('12345678Z');

    expect(spy).toHaveBeenCalled();
  });

  it('should validate documentNumber with userValidationRules', () => {
    const invalidDoc = 'invalid';
    const validDoc = '12345678Z';
    expect(component.userValidationRules[0](invalidDoc)).toBe('Has introducido un documento incorrecto');
    expect(component.userValidationRules[0](validDoc)).toBe(true);
  });

  it('listenDocumentField - valid: true', fakeAsync(() => {
    const event = new CustomEvent('bsInputValidate', {detail: ''});
    spyOn(component.documentValid, 'set')
    component.documentNumber.nativeElement.dispatchEvent(event);
    tick(10)
      expect(component.documentValid.set).toHaveBeenCalledWith(true)
     flush();
    })
  )

  it('listenDocumentField - valid: false', fakeAsync(() => {
    const event = new CustomEvent('bsInputValidate', {detail: 'Error'});
    spyOn(component.documentValid, 'set')
    component.documentNumber.nativeElement.dispatchEvent(event);
    tick(10)
      expect(component.documentValid.set).toHaveBeenCalledWith(false)
     flush();
    })
  )

  it('listenPhonetField - valid: true', () => {
    const isValidSpy = jasmine.createSpy('isValid').and.returnValue(Promise.resolve(true))
    const event = new CustomEvent('bsInputPhoneChange');
    
    component.inputPhone.nativeElement.isValid = isValidSpy
    component.inputPhone.nativeElement.attachShadow({mode: 'open'})
    component.listenPhoneField()
    component.inputPhone.nativeElement.dispatchEvent(event);
    
    expect(component.inputPhone.nativeElement.isValid).toHaveBeenCalled()
  })

  it('listenPhonetField - valid: false', () => {
    const isValidSpy = jasmine.createSpy('isValid').and.returnValue(Promise.resolve(false))
    const event = new CustomEvent('bsInputPhoneChange');
    
    component.inputPhone.nativeElement.isValid = isValidSpy
    component.inputPhone.nativeElement.attachShadow({mode: 'open'})
    component.listenPhoneField()
    component.inputPhone.nativeElement.dispatchEvent(event);
    
    expect(component.inputPhone.nativeElement.isValid).toHaveBeenCalled()
    expect(component.phoneValid()).toBeFalse()
  })

  it("secureLink es", () => {       
    loginTranslationService.getLanguage.and.returnValue('es_ES');
    const winodowSpy = spyOn(window, "open");
    component.secureLink();
    expect(winodowSpy).toHaveBeenCalledWith('https://www.bancsabadell.com/bsnacional/es/seguridad/', '_blank')
  })

  it("secureLink ca", () => {    
    loginTranslationService.getLanguage.and.returnValue('ca_ES');
    const winodowSpy = spyOn(window, "open");
    component.secureLink();
    expect(winodowSpy).toHaveBeenCalledWith('https://www.bancsabadell.com/bsnacional/ca/seguretat/', '_blank')
  })

  it("secureLink en", () => {    
    loginTranslationService.getLanguage.and.returnValue('en_GB');
    const winodowSpy = spyOn(window, "open");
    component.secureLink();
    expect(winodowSpy).toHaveBeenCalledWith('https://www.bancsabadell.com/bsnacional/en/security/', '_blank')
  })

  it("secureLink default", () => {    
    loginTranslationService.getLanguage.and.returnValue('gl_ES');
    const winodowSpy = spyOn(window, "open");
    component.secureLink();
    expect(winodowSpy).toHaveBeenCalledWith('https://www.bancsabadell.com/bsnacional/es/seguridad/', '_blank')
  })
});
