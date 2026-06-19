import { LoggerUtils } from '@proteo/logger-utils';
import { appendElementScript } from '@proteo/script-initialization-util';
import { TagManagerDriver } from '@proteo/tag-manager-driver';
import type {
  TagInfoRequest,
  TagManagerConfiguration,
  TagManagerDriverConfiguration,
  TagRequest,
  TagResponse
} from '@proteo/types';

/**
 * Tealium Driver
 */
export class TealiumInfoWebDriver extends TagManagerDriver {
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
    if (document.getElementById(TealiumInfoWebDriver.TEALIUM_LIB_SCRIPT_ID)) {
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
  public async trace<T>(tagRequest: TagRequest<T> | TagInfoRequest<T>): Promise<TagResponse<T>> {
    try {
      const loaded = await this._isLoaded;
      if (loaded) {
        this.checkBsSend();

        const request = tagRequest as TagInfoRequest<T>;
        window.bsSend(request.operation, request.data);
        LoggerUtils.getInstance().debug('[TealiumInfoWebDriver] data:', tagRequest, {
          remoteLogger: true,
          type: 'application'
        });

        return { data: request.data };
      } else {
        LoggerUtils.getInstance().error('[TealiumInfoWebDriver] driver is not initialized properly: ', loaded, {
          remoteLogger: true,
          type: 'application'
        });
      }
    } catch (e) {
      LoggerUtils.getInstance().error('[TealiumInfoWebDriver] driver error:', e, {
        remoteLogger: true,
        type: 'application'
      });
    }

    return { data: tagRequest.data };
  }

  /**
   * The function send the data object to remote experience server. Not defined for this driver.
   * @param tagRequest tag request information
   * @returns {Promise<TagResponse<T>>} tag response
   */
  public async traceExperience<T>(tagRequest: TagRequest<T>): Promise<TagResponse<unknown>> {
    LoggerUtils.getInstance().warn('[TealiumInfoWebDriver] traceExperience not defined', {
      remoteLogger: true,
      type: 'application'
    });
    return { data: tagRequest.data };
  }

  /**
   * Check if bsSend is defined
   */
  private checkBsSend() {
    if (!window.bsSend && typeof window.bsSend !== 'function') {
      LoggerUtils.getInstance().error('[TealiumInfoWebDriver] bsSend is not defined', {
        remoteLogger: true,
        type: 'application'
      });
    }
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
          LoggerUtils.getInstance().error('[TealiumInfoWebDriver] not initialized: missing host in configuration', {
            remoteLogger: true,
            type: 'application'
          });
          resolve(false);
        } else {
          const scriptElement = document.createElement('script');
          scriptElement.id = TealiumInfoWebDriver.TEALIUM_LIB_SCRIPT_ID;
          scriptElement.src = ''; // Deprecated
          scriptElement.type = 'text/javascript';
          scriptElement.async = true;
          this._config.class && this._config.class.forEach((c: string) => scriptElement.classList.add(c));
          scriptElement.onload = (_result) => {
            resolve(true);
          };
          appendElementScript(scriptElement);
        }
      } catch (error) {
        LoggerUtils.getInstance().error('[TealiumInfoWebDriver] tag manager can not be initialized', error, {
          remoteLogger: true,
          type: 'application'
        });
        resolve(false);
      }
    });
  }
}
