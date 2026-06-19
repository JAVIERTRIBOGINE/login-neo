/* eslint-disable @typescript-eslint/no-explicit-any */
import { Routes } from '@angular/router';
import { BootstrapDrivers, CoreBrowserConfig, LoaderConf } from '@proteo/types';

export interface NgProteoBootstrap {
  config?: LoaderConf;
  staticRoutes: Routes;
  drivers?: BootstrapDrivers;
}

export interface NgProteoBootstrapConfig extends CoreBrowserConfig {
  DYNAMIC_ROUTING?: any;
}
