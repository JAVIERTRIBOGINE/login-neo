import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, UrlTree, CanActivateFn } from '@angular/router';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { LoginDataService } from '../services/login-data.service';
import { ROUTE_DATA } from '@app/login/domain/constants/path.constant';


export const AuthGuard : CanActivateFn =  (next: ActivatedRouteSnapshot):
 Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree => {

  const router = inject(Router);
  const loginDataService = inject(LoginDataService);

  if(
    next.routeConfig?.path === 'otp' && loginDataService.stepLoginComplete() || 
    next.routeConfig?.path === 'success' && loginDataService.stepSuccessComplete())
  {
    return true;
  } else {
   router.navigate([`/${ROUTE_DATA.ROOT}`]);
    return false;
  }
}