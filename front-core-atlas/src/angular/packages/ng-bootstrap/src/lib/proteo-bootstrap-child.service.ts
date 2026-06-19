import { Injectable } from '@angular/core';
import { ConfigLoader } from '@proteo/config-loader';
import { initialize as initializeDataManager } from '@proteo/data-manager';
import { BaseConfig, LoaderConf } from '@proteo/types';

/**
 * Service responsible for bootstrapping child microfrontend in the Proteo Bootstrap framework.
 */
@Injectable({ providedIn: 'any' })
export class ProteoBootstrapChildService {
  private mfeChildConf: BaseConfig;

  /**
   * Bootstraps a child microfrontend with the provided configuration.
   * @param config The configuration for the child microfrontend.
   * @returns A promise that resolves to the typed configuration object.
   */
  async bootstrap<T extends BaseConfig>(config: LoaderConf): Promise<T> {
    this.mfeChildConf = await ConfigLoader.retrieveAllGlobalConfig<T>(config);

    /**
     * Re-initialize DataManager - this is necessary for add drivers
     * because DataManager is a singleton and the parent microfrontend
     */
    await initializeDataManager(this.mfeChildConf.DATAMANAGER_CONFIG);

    return Promise.resolve(this.mfeChildConf as T);
  }
}
