import { APP_INITIALIZER, makeEnvironmentProviders } from '@angular/core';
import { provideRouter } from '@angular/router';
import { DynamicRoutingService } from './services/dynamic-routing.service';
import { LoadRemoteService } from './services/load-remote.service';
import { DYNAMIC_ROUTES, ERROR_ROUTE_PATH, LOCAL_ROUTES, ROOT_PATH } from './tokens';
import { DynamicRoutingConfig } from './models/dynamic-routing.model';

/**
 * Initialize dynamic routing service and build all routes from statics (local) and manifest (remote)
 * this generate all mfe routes inside the root path (only in first level) ex.
 * [\\{ path: '', children: [ \\{ path: 'myMfe', xxx }], xxx } xxx ]
 * @param {DynamicRoutingConfig} config - config
 * @returns {EnvironmentProviders} EnvironmentProviders
 */
export function provideDynamicRouting(config: DynamicRoutingConfig) {
  return makeEnvironmentProviders([
    provideRouter(config.staticRoutes),
    DynamicRoutingService,
    LoadRemoteService,
    {
      provide: APP_INITIALIZER,
      useFactory: (config: DynamicRoutingService) => async () => {
        return await config.initialize();
      },
      multi: true,
      deps: [DynamicRoutingService]
    },
    {
      provide: LOCAL_ROUTES,
      useValue: config.staticRoutes
    },
    {
      provide: DYNAMIC_ROUTES,
      useValue: config.dynamicRoutes
    },
    {
      provide: ROOT_PATH,
      useValue: config.rootPath ?? ''
    },
    {
      provide: ERROR_ROUTE_PATH,
      useValue: config.errorRoutePath
    }
  ]);
}
