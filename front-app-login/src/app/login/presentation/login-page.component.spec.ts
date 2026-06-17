import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { LoginPageComponent } from './login-page.component';
import { LoginTranslationService } from '../application/services/login-translation.service';
import { PROTEO_APP_CONF } from '@proteo/ng-bootstrap';
import { AuthConfig } from '@proteo/types';
import { LoginDataService } from '../application/services/login-data.service';

describe('LoginPageComponent', () => {
  let fixture: ComponentFixture<LoginPageComponent>;
  let router: Router;
  let component: LoginPageComponent;

  const mockAuthConfig: AuthConfig = { 
    DATA_MANAGER: "mock DM",
    AUTH_TYPE: "LIGHT_USERS",
    CLIENT_ID: "mock-client",
    REDIRECT_URI: "http://localhost:4500/token",
    SCOPES: ["mockScope"]
   };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ 
          { provide: PROTEO_APP_CONF,
            useValue: {AUTH_CONFIG: mockAuthConfig  } 
          }  
                        
        ,
        LoginTranslationService, LoginDataService],
      imports: [LoginPageComponent]
    });

    fixture = TestBed.createComponent(LoginPageComponent);
    router = TestBed.inject(Router);
    component = fixture.componentInstance;
    router.initialNavigation();
  });

  it('should create the app', () => {
  
    expect(component).toBeTruthy();
  
  });

  it("on init", () => {
    spyOn(component, 'initializing');
    component.ngOnInit();
    expect(component.initializing).toHaveBeenCalled()
  })

  it('should have a router outlet', () => {
    const compiled = fixture.debugElement.nativeElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });

  it('should navigate to the correct route', () => {
    const navigateSpy = spyOn(router, 'navigate');
    router.navigate(['login']);
    expect(navigateSpy).toHaveBeenCalledWith(['login']);
  });

   it('should call initialize if isAuthInitialized returns false', () => {
    
    spyOn(component, 'isAuthInitialized').and.returnValue(false )
    spyOn(component, 'initialize');
    component.initializing();
    expect(component.initialize).toHaveBeenCalledWith(mockAuthConfig);
  });



});

