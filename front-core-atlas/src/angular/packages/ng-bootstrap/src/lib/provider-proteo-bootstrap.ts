import { APP_INITIALIZER, makeEnvironmentProviders } from '@angular/core';

import { Injector } from '@angular/core';
import { provideRouter } from '@angular/router';
import { LoggerUtils } from '@proteo/logger-utils';
import { BrowserPlatform } from '@proteo/platform';
import { BsApplicationList, LoadRemoteService, DynamicRoutingService, LOCAL_ROUTES, BsGenerateRoutesConfig } from '@proteo/ng-routing';
import { NgProteoBootstrap, NgProteoBootstrapConfig } from './models/proteo-bootstrap.model';
import { PROTEO_4_INIT_DATA, PROTEO_4_INIT_EXTERNAL_DATA, PROTEO_APP_CONF, PROTEO_MFE_CONF } from './tokens';

/**
 * Use this method in your boostraping application to initialize the proteo4 ecosystem
 * @param config the loader config extension, including host, config base path and extra files to load
 * @param drivers a process object with the drivers that should be necessary to bootstrap the proteo4 utilities
 */

export function provideProteoBootstrap<T extends NgProteoBootstrapConfig>(config: NgProteoBootstrap) {
  let localConfig: T;
  let manifest: BsApplicationList = {};

  return makeEnvironmentProviders([
    provideRouter(config.staticRoutes),
    DynamicRoutingService,
    LoadRemoteService,
    {
      provide: APP_INITIALIZER,
      useFactory: (injector: Injector, dynamicRoutingService: DynamicRoutingService) => {
        return async () => {
          const bootstrapConf = { ...injector.get(PROTEO_MFE_CONF, null), ...config.config };

          localConfig = await new BrowserPlatform<T>().bootstrap(bootstrapConf, config.drivers);

          if (localConfig?.DYNAMIC_ROUTING) {
            LoggerUtils.getInstance().debug(`[ProteoBootstrap] Dynamic routing is enabled.`);

            const dynamicRoutingConf = localConfig.DYNAMIC_ROUTING;

            const host = config.config?.HOST || '';
            const basePath = config.config?.CONFIG_BASE_PATH || 'conf/';

            try {
              const response = await fetch(host + basePath + 'manifest.json');

              if (response.ok) {
                try {
                  manifest = await response.json();
                } catch (e) {
                  LoggerUtils.getInstance().error(`[ProteoBootstrap] Can't parse manifest.json file`);
                }

                const generateRoutesConfig: BsGenerateRoutesConfig = {
                  applications: manifest,
                  errorRoutePath: dynamicRoutingConf.ERROR_PATH,
                  rootPath: dynamicRoutingConf.ROOT_PATH,
                  auth: dynamicRoutingConf.AUTH_CONFIG,
                  ulMapping: dynamicRoutingConf.UL_MAPPING,
                  featureManager: dynamicRoutingConf.FEATURE_MANAGER,
                  initData: localConfig.INIT_DATA
                };

                return await dynamicRoutingService.initialize(generateRoutesConfig);
              } else {
                LoggerUtils.getInstance().error(`[ProteoBootstrap] Can't load manifest.json file from ${host + basePath}`);
              }
            } catch (e) {
              LoggerUtils.getInstance().error(`[ProteoBootstrap] Can't load manifest.json file from ${host + basePath}`);
            }
          }
        };
      },
      multi: true,
      deps: [Injector, DynamicRoutingService]
    },
    {
      provide: PROTEO_APP_CONF,
      useFactory: () => localConfig
    },
    {
      provide: PROTEO_4_INIT_EXTERNAL_DATA,
      useFactory: () => localConfig.INIT_DATA?.externalData
    },
    {
      provide: PROTEO_4_INIT_DATA,
      useFactory: () => localConfig.INIT_DATA
    },
    {
      provide: LOCAL_ROUTES,
      useValue: config.staticRoutes
    }
  ]);
}
