import { ExternalWebLoaderBridge } from '@proteo/bridge';
import { ConfigLoader } from '@proteo/config-loader';
import { initialize as initializeDataManager } from '@proteo/data-manager';
import type { BaseAppConfig, DataManagerConfig, LoaderConf } from '@proteo/types';

/**
 * Class for Proteo4 External Loader initialization in a browser environment. It will The bridge to the proteo4 ecosystem exposing a Custom Event API
 */
export class ExternalLoaderBrowserPlatform<T extends BaseAppConfig> {
  /**
   * Bootstrap the configuration loading it from an external resource and initialize postMessage Wrapper
   * @param config the loader configuration. It can receive the host, path and extra files to load
   * @param iframe iframe reference for initialization
   */
  async bootstrap(config?: LoaderConf, iframe?: HTMLIFrameElement) {
    const externalConf = await ConfigLoader.retrieveAllGlobalConfig<T>(config as LoaderConf);
    new ExternalWebLoaderBridge(iframe);

    // FIXME: external loader does not read external configuration (due to relative
    // domain resolution). Hard coding default values for NETi
    const defaultConfig: DataManagerConfig = {
      DEFAULT: {
        HOST: '',
        BASE_PATH: '/txbs/JSONUtils.json.bs',
        DRIVER: 'HTTP'
      }
    };
    const dataManagerConfig: DataManagerConfig = {
      ...defaultConfig,
      ...externalConf?.DATAMANAGER_CONFIG
    };

    await initializeDataManager(dataManagerConfig);

    return externalConf;
  }
}
