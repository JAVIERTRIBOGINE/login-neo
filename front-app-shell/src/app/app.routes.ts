import { Routes } from '@angular/router';

import { LandingComponent } from './components/landing/landing.component';
import { RemoteComponentHostComponent } from './components/remote-component-host/remote-component-host.component';

export const SHELL_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: LandingComponent,
  },
  {
    path: 'saml/resources',
    component: RemoteComponentHostComponent,
    data: {
      exposedModule: './SamlMfe',
      exportName: 'ResourcesComponent',
    },
  },
  {
    path: 'saml/acs',
    component: RemoteComponentHostComponent,
    data: {
      exposedModule: './SamlResponseComponent',
      exportName: 'SamlResponseComponent',
    },
  },
  {
    path: 'login',
    component: RemoteComponentHostComponent,
    data: {
      exposedModule: './LoginComponent',
      exportName: 'LoginComponent',
    },
  },
  {
    path: 'authorize',
    component: RemoteComponentHostComponent,
    data: {
      exposedModule: './AuthorizeComponent',
      exportName: 'AuthorizeComponent',
    },
  },
  {
    path: 'token',
    component: RemoteComponentHostComponent,
    data: {
      exposedModule: './GetTokensComponent',
      exportName: 'GetTokensComponent',
    },
  },
  {
    path: '**',
    redirectTo: '',
  },
];
