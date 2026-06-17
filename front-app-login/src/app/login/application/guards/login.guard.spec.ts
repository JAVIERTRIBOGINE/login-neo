import { AuthGuard } from './login.guard';
import { Router, RouterStateSnapshot } from '@angular/router';
import { LoginDataService } from '@app/login/application/services/login-data.service';
import { ActivatedRouteSnapshot } from '@angular/router';
import { TestBed } from '@angular/core/testing';

describe('AuthGuard', () => {
  let routerSpy: jasmine.SpyObj<Router>;
  let loginDataServiceSpy: jasmine.SpyObj<LoginDataService>;
  const dummyState = {} as RouterStateSnapshot;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    loginDataServiceSpy = jasmine.createSpyObj('LoginDataService', [
      'stepLoginComplete',
      'stepSuccessComplete'
    ]);

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: LoginDataService, useValue: loginDataServiceSpy }
      ]
    });
  });

  function createRouteSnapshot(path: string): ActivatedRouteSnapshot {
    return {
      routeConfig: { path }
    } as ActivatedRouteSnapshot;
  }

  it('should allow access to otp route if stepLoginComplete is true', () => {
    loginDataServiceSpy.stepLoginComplete.and.returnValue(true);
    
    const result = TestBed.runInInjectionContext(() =>  {AuthGuard(createRouteSnapshot('otp'), dummyState )}
);
  
     
    expect(result).toBeUndefined();
  });

  it('should allow access to success route if stepSuccessComplete is true', () => {
    loginDataServiceSpy.stepSuccessComplete.and.returnValue(true);
    const result = TestBed.runInInjectionContext(() =>  {
    AuthGuard(createRouteSnapshot('success'), dummyState)});
    expect(result).toBeUndefined();
  });

  it('should deny access and navigate to login if conditions are not met', () => {
    loginDataServiceSpy.stepLoginComplete.and.returnValue(false);
    loginDataServiceSpy.stepSuccessComplete.and.returnValue(false);
    const result = TestBed.runInInjectionContext(() =>  {
    AuthGuard(createRouteSnapshot('otp'), dummyState)});
    expect(result).toBeUndefined();
    expect(routerSpy.navigate).toHaveBeenCalledWith([`/`]);
  });
});
