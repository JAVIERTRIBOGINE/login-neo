import { LoggerUtils } from '@proteo/logger-utils';
import { appendElementScript } from '@proteo/script-initialization-util';
import { getEnvironment } from '@proteo/environment-detection-utils';
import { TagManagerDriver } from '@proteo/tag-manager-driver';
import { TealiumService } from '@proteo/tag-manager-service-tealium';
import {
  TEALIUM_TX_UTAG_SRC,
  type TagManagerConfiguration,
  type TagManagerDriverConfiguration,
  type TagRequest,
  type TagResponse
} from '@proteo/types';

/**
 * Tealium Driver
 */
export class TealiumTxWebDriver extends TagManagerDriver {
  /**
   * Tealium lib script
   */
  protected static readonly TEALIUM_LIB_SCRIPT_ID = 'tealium_lib';

  /**
   * this property checks when the library is loaded.
   * If the library is loaded the promise will be resolved
   */
  private _isLoaded: Promise<boolean> = Promise.resolve(false);

  /**
   * Constructor for class
   * @param config Tag manager configuration options
   */
  constructor(config?: TagManagerConfiguration) {
    super(config);
  }

  /**
   * Initializer for this tag manager driver
   * @param conf Configuration for the driver
   */
  setup(conf: TagManagerDriverConfiguration): void {
    conf && (this._config = { class: conf?.class });
    if (document.getElementById(TealiumTxWebDriver.TEALIUM_LIB_SCRIPT_ID)) {
      this._isLoaded = Promise.resolve(true);
    } else {
      this._isLoaded = this.initializeTealium().then((result) => {
        return result;
      });
    }
  }

  /**
   * The function send the data object to remote server.
   * @param tagRequest tag request information
   * @returns {Promise<TagResponse<T>>} tag response
   */
  public async trace<T>(tagRequest: TagRequest<T>): Promise<TagResponse<T>> {
    try {
      const loaded = await this._isLoaded;
      if (loaded) {
        this.checkBsProcesos();

        const tealiumDataCloned = { ...tagRequest.data };
        const tealiumDataObfuscated = TealiumService.obfuscateData<T>(tealiumDataCloned, tagRequest.options) as T;
        window.bsProcesos(tealiumDataObfuscated);
        LoggerUtils.getInstance().debug('[TealiumTxWebDriver] data:', tagRequest.data, {
          remoteLogger: true,
          type: 'application'
        });

        return { data: tealiumDataObfuscated };
      } else {
        LoggerUtils.getInstance().error('[TealiumTxWebDriver] driver is not initialized properly:', loaded, {
          remoteLogger: true,
          type: 'application'
        });
      }
    } catch (e) {
      LoggerUtils.getInstance().error('[TealiumTxWebDriver] driver error:', e, {
        remoteLogger: true,
        type: 'application'
      });
    }

    return { data: tagRequest.data };
  }

  /**
   * Check if bsProcesos is defined
   */
  private checkBsProcesos() {
    if (!window.bsProcesos && typeof window.bsProcesos !== 'function') {
      LoggerUtils.getInstance().error('[TealiumTxWebDriver] bsProcesos is not defined', {
        remoteLogger: true,
        type: 'application'
      });
    }
  }

  /**
   * The function send the data object to remote experience server. Not defined for this driver.
   * @param tagRequest tag request information
   * @returns {Promise<TagResponse<T>>} tag response
   */
  public async traceExperience<T>(tagRequest: TagRequest<T>): Promise<TagResponse<unknown>> {
    LoggerUtils.getInstance().warn('[TealiumTxWebDriver] traceExperience not defined', {
      remoteLogger: true,
      type: 'application'
    });
    return { data: tagRequest.data };
  }

  /**
   * private function to inject the external Tealium library
   * The load is encapsulated into a promise to resolve only when the library is loaded
   * @returns {Promise<boolean>} boolean to indicate the initialization response
   */
  private async initializeTealium(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        if (!this._config) {
          LoggerUtils.getInstance().error('[TealiumTxWebDriver] not initialized', {
            remoteLogger: true,
            type: 'application'
          });
          resolve(false);
        } else {
          const environment = getEnvironment();
          const scriptElement = document.createElement('script');
          scriptElement.onload = (_result) => {
            resolve(true);
          };
          scriptElement.src = TEALIUM_TX_UTAG_SRC[environment];
          scriptElement.id = TealiumTxWebDriver.TEALIUM_LIB_SCRIPT_ID;
          scriptElement.type = 'text/javascript';
          scriptElement.async = true;
          this._config.class && this._config.class.forEach((c: string) => scriptElement.classList.add(c));

          appendElementScript(scriptElement);
        }
      } catch (error) {
        LoggerUtils.getInstance().error('[TealiumTxWebDriver] tag manager can not be initialized', error, {
          remoteLogger: true,
          type: 'application'
        });
        resolve(false);
      }
    });
  }
}
