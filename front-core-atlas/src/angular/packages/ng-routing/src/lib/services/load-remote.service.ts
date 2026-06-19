import { Injectable } from '@angular/core';
import { LoggerUtils } from '@proteo/logger-utils';
import { BsComponentFederated, RemoteStatus } from '../models/dynamic-routing.model';
import { ModuleFederationWrapper } from '../utils/module.federation';

@Injectable({ providedIn: 'root' })
export class LoadRemoteService {
  /**
   * Resolve if remote host is available with fetch of HEAD
   * @param remoteEntry is a routePath (remoteEntry.js) in remote host (ex. http://localhost:4242/remoteEntry.js)
   * @returns {RemoteStatus} RemoteStatus.'AVAILABLE' or RemoteStatus.'NOT_AVAILABLE'
   */

  public async checkRemoteIsAvailable(remoteEntry: string): Promise<RemoteStatus> {
    return fetch(remoteEntry, {
      method: 'HEAD'
    })
      .then((response) => {
        if (response.status === 200) {
          return RemoteStatus.AVAILABLE;
        }
        return RemoteStatus.NOT_AVAILABLE;
      })
      .catch((e) => {
        return RemoteStatus.NOT_AVAILABLE;
      });
  }

  /**
   * Retrieves a remote module based on the provided remote configuration.
   * @param remoteConfig The remote configuration object containing the remote entry and exposed module.
   * @returns A promise that resolves to the loaded remote module.
   */
  public getRemoteModule<T>(remoteConfig: BsComponentFederated): Promise<T> {
    return ModuleFederationWrapper.loadRemoteModule<T>({
      type: 'module',
      remoteEntry: remoteConfig.remoteEntry,
      exposedModule: remoteConfig.exposedModule
    })
      .then((remoteModule) => {
        LoggerUtils.getInstance().debug(`[LoadRemoteService] Load remote: ${remoteConfig.remoteEntry}`);
        return remoteModule;
      })
      .catch((error) => {
        const strError = JSON.stringify(error, null, 2);
        LoggerUtils.getInstance().error(`[LoadRemoteService] Can't load remote: ${strError}`);
        return error;
      });
  }
}
