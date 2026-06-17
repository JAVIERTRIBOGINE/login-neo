import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { LastStepComponent } from './last-step.component';
import { MessageService } from '@app/login/application/services/message.service';
import { PublishService } from '@app/login/application/services/publish.service';
import { ActivatedRoute, Router } from '@angular/router';
import { mockActivatedRoute } from '@app/login/domain/mocks.constants';
import { TranslateService } from '@proteo/ng-translate';
import { LOGIN_EVENTS } from '@app/login/domain/constants/event.enum';
import { LoginDataService } from '@app/login/application/services/login-data.service';
import { TealiumTraceLoginService } from '@app/login/application/services/tealium-trace-login.service';
import { LINK_NAMES, STEPS, OP_STEPS } from '@app/login/domain/constants/global.constants';
import { ROUTE_DATA } from '@app/login/domain/constants/path.constant';


describe('LastStepComponent', () => {
  let component: LastStepComponent;
  let fixture: ComponentFixture<LastStepComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CommonModule, LastStepComponent],
      providers: [
        TranslateService, MessageService, PublishService, Router, LoginDataService,
        { provide: TealiumTraceLoginService, useValue: jasmine.createSpyObj("TealiumTraceLoginService", [
                "sendLoginPageTealiumTrace", "sendLoginTealliumTagEvent"])},
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LastStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

    it('On Init', () => {
      spyOn(component, "handleTimer")
      component.ngOnInit();
      expect(component.tealiumTraceService.sendLoginPageTealiumTrace).
      toHaveBeenCalledWith(  
              LINK_NAMES['OPERATIVA_CONFIRMACION'], STEPS['CONFIRMACION'], OP_STEPS['CONFIRMACION']
        
      )
      expect(component.handleTimer).toHaveBeenCalled()
    })

  it('authorizeSession', () => {
    spyOn(component.router, 'navigate');

    component.authorizeSession()
    expect(component.router.navigate).toHaveBeenCalledWith(
      [`../${ROUTE_DATA.AUTHORIZE}`], { relativeTo: component.route }
    );
  });

  it(' openHelpModal', () => {
    spyOn(component.publishService, 'publishEvent');

    component.openHelpModal()
    expect(component.publishService.publishEvent).toHaveBeenCalledWith(LOGIN_EVENTS.HELP);
  });

  it("handleTimer", fakeAsync( () =>{
    const path = [`../${ROUTE_DATA.AUTHORIZE}`]
    const optionsObj = { relativeTo: component.route };
    spyOn(component.router, "navigate")
    component.handleTimer()
    tick(3000);
    expect(component.router.navigate).toHaveBeenCalledOnceWith(path, optionsObj)
    flush()
  }))

});
