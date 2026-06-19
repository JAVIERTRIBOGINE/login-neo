import { Route, Router } from '@angular/router';
import { LoggerUtils } from '@proteo/logger-utils';
import { BsApplication, BsMicrofrontend, BsMicrofrontendLegacy } from '../models/dynamic-routing.model';
import { EventManager } from '@proteo/event-bus';
import { Component, inject } from '@angular/core';
import { EnumEnvironments } from '@proteo/types';
import { getEnvironment } from '@proteo/environment-detection-utils';
import { authGuard } from '../guards/auth.guard';
import { ModuleFederationWrapper } from './module.federation';
import { ErrorManagementPayload, ProteoErrorEnum } from '@proteo/error-management-utils';


export const host = {
  [EnumEnvironments.INT]: 'https://apps.cdn.int.aws.bancsabadell.com',
  [EnumEnvironments.PRE]: 'https://apps.cdn.pre.aws.bancsabadell.com',
  [EnumEnvironments.PRO]: 'https://apps.cdn.aws.bancsabadell.com'
};

@Component({
  selector: 'proteo-dummy-component',
  template: ''
})
export class DummyComponent {}

function buildRouteMicrofrontend(params:{app: BsApplication}): Route {
  const { app } = params;
  const routeConfig = app.routeConfig as BsMicrofrontend;

  return {
    path: routeConfig.routePath,
    canActivate: [
      ...(routeConfig.isAuthenticate ? [authGuard] : [])
    ],
    children: [
      {
        path: '',
        loadChildren: () =>
          ModuleFederationWrapper.loadRemoteModule({
            type: 'module',
            remoteEntry: routeConfig.remoteEntry,
            exposedModule: routeConfig.exposedModule
          })
            .then((module) => {
              LoggerUtils.getInstance().debug(`[DynamicRouting] Try Load Module : ${routeConfig.nameModule} from ${routeConfig.remoteEntry}`);
              return module[routeConfig.nameModule];
            })
            .catch((errorPayload: ErrorManagementPayload) => {
              LoggerUtils.getInstance().error(`[DynamicRouting] Can't load remote ${errorPayload.errorSource}. Reason: ${errorPayload.errorMessageDetail}`);
            })
      }
    ],
    data: app
  };
}

function buildRouteMicrofrontendLegacy(params: { app: BsApplication}): Route {
  const routeConfig = params.app.routeConfig as BsMicrofrontendLegacy;

  return {
    path: routeConfig.routePath,
    loadComponent: () => import('@proteo/ng-legacy-loader').then((cmp) => cmp.LegacyLoaderComponent),
    data: params.app,
    ...(routeConfig.isAuthenticate && { canActivate: [authGuard] })
  };
}

function buildRouteToNative(params: {app: BsApplication}): Route {
  const routeConfig = params.app.routeConfig;

  return {
    path: routeConfig.routePath,
    canActivate: [
      () => {
        const router = inject(Router);
        const payload: any = {
          method: 'openOperative',
          data: {
            operativeName: params.app.appId
          }
        };

        if (router.getCurrentNavigation().extras.state) {
          payload.data.externalData = router.getCurrentNavigation().extras.state;
        }

        EventManager.getInstance().publish('OPEN_OPERATIVE', payload);
        return false;
      }
    ],
    component: DummyComponent,
    data: params.app
  };
}

function buildRouteToMaintenance(params: { app: BsApplication }): Route {
  const routeConfig = params.app.routeConfig as BsMicrofrontendLegacy;
  (params.app.routeConfig as BsMicrofrontendLegacy).url = `${host[getEnvironment()]}/app/maintenance/v0/?cause=${params.app.maintenance}`;

  return {
    path: routeConfig.routePath,
    loadComponent: () => import('@proteo/ng-legacy-loader').then((cmp) => cmp.LegacyLoaderComponent),
    data: params.app,
    ...(routeConfig.isAuthenticate && { canActivate: [authGuard] })
  };
}

export const buildRoute = {
  P4_MFE: buildRouteMicrofrontend,
  P4_MFE_LEGACY: buildRouteMicrofrontendLegacy,
  NATIVE: buildRouteToNative,
  MAINTENANCE: buildRouteToMaintenance,
  DEFAULT: (app: BsApplication) => {
    LoggerUtils.getInstance().debug(`[DynamicRouting] Can't build route from this application config: ${app}`);
  }
};
