import { CanMatchFn, Routes } from '@angular/router';
import { ROUTE_DATA } from './login/domain/constants/path.constant';
import { AuthGuard } from './login/application/guards/login.guard';
import { SAML_ROUTE_DATA } from './saml-flow/domain/constants/path.constant';

const SKIP_SAML_RESOURCES_ONCE = 'login.skipSamlResourcesOnce';

export const skipSamlResourcesOnce = (): void => {
  window.sessionStorage.setItem(SKIP_SAML_RESOURCES_ONCE, 'true');
};

const shouldStartSamlFlow: CanMatchFn = () => {
  const skipSamlResources = window.sessionStorage.getItem(SKIP_SAML_RESOURCES_ONCE) === 'true';
  window.sessionStorage.removeItem(SKIP_SAML_RESOURCES_ONCE);
  return !skipSamlResources;
};

export const APP_ROUTES: Routes = [
  {
    path: ROUTE_DATA.ROOT,
    loadComponent: () =>
      import('./login/presentation/login-page.component').then(
        (m) => m.LoginPageComponent
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        canMatch: [shouldStartSamlFlow],
        loadComponent: () => import('./saml-flow/presentation/pages/saml-start/saml-start.component').then((c) => c.SamlStartComponent),
      },
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./login/presentation/pages/login/login.component').then((c) => c.LoginComponent),
      },
      {
        path: ROUTE_DATA.LOGIN,
        loadComponent: () => import('./login/presentation/pages/login/login.component').then((c) => c.LoginComponent),
      },
      {
        path: ROUTE_DATA.OTP,
        loadComponent: () => import('./login/presentation/pages/otp/otp.component').then((c) => c.OtpComponent),
        canActivate: [AuthGuard] 
      },
      {
        path: ROUTE_DATA.SUCCESS,
        loadComponent: () => import('./login/presentation/pages/last-step/last-step.component').then((c) => c.LastStepComponent),
        canActivate: [AuthGuard] 
      },
      {
        path: ROUTE_DATA.ERROR,
        loadComponent: () => import('./login/presentation/pages/error-page/error.component').then((c) => c.ErrorComponent),
      },
      {
        path: ROUTE_DATA.GET_TOKENS,
        loadComponent: () => import('./login/presentation/pages/get-tokens/get-tokens.component').then((c) => c.GetTokensComponent),
      },
      {
        path: ROUTE_DATA.AUTHORIZE,
        loadComponent: () => import('./login/presentation/pages/authorize/authorize.component').then((c) => c.AuthorizeComponent),
      },
    ],
  },
  {
    path: SAML_ROUTE_DATA.RESOURCES,
    loadComponent: () => import('./saml-flow/presentation/pages/resources/resources.component').then((c) => c.ResourcesComponent),
  },
  {
    path: SAML_ROUTE_DATA.ACS,
    loadComponent: () => import('./saml-flow/presentation/pages/saml-response/saml-response.component').then((c) => c.SamlResponseComponent),
  },
  {
    path: '**',
    pathMatch: 'full',
    redirectTo: ROUTE_DATA.ROOT,
  },
];
