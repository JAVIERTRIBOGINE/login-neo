import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ErrorComponent } from './error.component';
import { CommonModule } from '@angular/common';
import { BsApplication } from '@proteo/ng-routing';
import { BUTTON_ACTION } from '@app/login/domain/models/message-scr-conf.model';
import { LOGIN_EVENTS } from '@app/login/domain/constants/event.enum';
import { MessageService } from '@app/login/application/services/message.service';
import { ROUTE_DATA } from '@app/login/domain/constants/path.constant';

const MOCK_MFE_INFO: BsApplication = {
  appId: 'testApp',
  type: 'P4_MFE',
  routeConfig: {
    remoteEntry: 'http://localhost:0000/remoteEntry.js',
    exposedModule: './testApplication',
    nameModule: 'AppChildModule',
    routePath: 'test',
    isAuthenticate: true,
    isPiloting: true
  },
  payload: {
    data: 'This is example payload send in routing angular'
  }
};

describe('ErrorComponent', () => {
  let component: ErrorComponent;
  let fixture: ComponentFixture<ErrorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CommonModule, ErrorComponent],
      providers: [
        MessageService,
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParams: {
                ...MOCK_MFE_INFO
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('handleMessageAction - retry', () => {
    const mockEvent = BUTTON_ACTION.RETRY;
    spyOn(component['router'], "navigate" )
    spyOn(component.publishService, 'publishEvent');
    component.handleMessageAction(mockEvent)
    expect(component.publishService.publishEvent).toHaveBeenCalledWith(LOGIN_EVENTS.FOOTER, true);
  });

  it('handleMessageAction - default', () => {
    const mockEvent = BUTTON_ACTION.NO_ACTION;
    spyOn(component.publishService, 'publishEvent');
    component.handleMessageAction(mockEvent)
    expect(component.publishService.publishEvent).not.toHaveBeenCalledWith(LOGIN_EVENTS.FOOTER, true);
  });

  it('handleMessageAction - Action Help', () => {
    const mockEvent = BUTTON_ACTION.HELP;
    spyOn(component.publishService, 'publishEvent');
    component.handleMessageAction(mockEvent)
    expect(component.publishService.publishEvent).toHaveBeenCalledWith(LOGIN_EVENTS.HELP);
  });


  it('get translation title', () => {
    spyOn(component.loginTranslationService, 'translateFromKey').and.callFake(key => {
      return  key==='login:APP.STATIC_PAGE.ERROR.TITLE'?'error title':'no title'
    });
    const result = component.getTranslation('login:APP.STATIC_PAGE.ERROR.TITLE')
    expect(result).toEqual('error title');
  });

  
  it('get translation no title', () => {
    spyOn(component.loginTranslationService, 'translateFromKey').and.callFake(key => {
      return  key==='login:APP.STATIC_PAGE.ERROR.TITLE'?'error title':'no title'
    });
    const result = component.getTranslation('login:APP.STATIC_PAGE.ERROR.NOTITLE')
    expect(result).toEqual('no title');
  });

  it("clickHelp", () => {
    spyOn(component.publishService, "publishEvent");
    component.clickHelp();
    expect(component.publishService.publishEvent).toHaveBeenCalledOnceWith(LOGIN_EVENTS.HELP)
  })

  it("retry", () => {
    spyOn(component.publishService, "publishEvent");
    spyOn(component['router'], "navigate" )
    component.retry();
    expect(component.publishService.publishEvent).toHaveBeenCalledWith(
      LOGIN_EVENTS.FOOTER, true
    )
    expect(component['router'].navigate).toHaveBeenCalledWith([`./${ROUTE_DATA.LOGIN}`] )
  })
});
