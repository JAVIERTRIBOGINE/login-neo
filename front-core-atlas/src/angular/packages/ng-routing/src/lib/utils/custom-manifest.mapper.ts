import { Manifest, RemoteConfig } from '@angular-architects/module-federation';
import { BsApplicationList, BsApplicationType } from '../models/dynamic-routing.model';
import { deepClone } from './deep-clone';

/**
 * Add property type 'module' for each route config (necessary for build routes)
 * @param obj All routes config for each MFE
 * @returns The same object with added type 'module', is necessary for build routes in DynamicRoutingService
 */
export function generateRouteManifest(obj: BsApplicationList): Manifest<RemoteConfig> {
  const copyObj = deepClone(obj);
  let manifest: Manifest<RemoteConfig> = {};
  Object.keys(copyObj).forEach((key) => {
    if (copyObj[key].type === BsApplicationType.P4_MFE) {
      manifest = {
        ...manifest,
        [key]: {
          ...copyObj[key].routeConfig,
          type: 'module'
        }
      };
    }
  });

  return manifest;
}
