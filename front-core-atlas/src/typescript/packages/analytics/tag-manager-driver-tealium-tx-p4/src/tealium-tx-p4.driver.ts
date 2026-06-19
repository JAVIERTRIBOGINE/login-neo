import { LoggerUtils } from '@proteo/logger-utils';
import { appendElementScript } from '@proteo/script-initialization-util';
import { getEnvironment } from '@proteo/environment-detection-utils';
import { TagManagerDriver } from '@proteo/tag-manager-driver';
import {
  type TagManagerDriverConfiguration,
  type TagRequest,
  type TagResponse,
  type DataLayerTXP4,
  TEALIUM_TX_P4_UTAG_SRC,
  TEALIUM_TX_P4_UTAG_SYNC_SRC
} from '@proteo/types';
import { isWebContainer } from '@proteo/platform-utils';
import { EventManager } from '@proteo/event-bus';

/**
 * Tealium TX-P4 Driver
 */
export class TealiumTxP4Driver extends TagManagerDriver {
  public static TEALIUM_UTAG_SCRIPT_ID = 'tealiumTxP4Script';
  public static TEALIUM_UTAG_SYNC_SCRIPT_ID = 'tealiumTxP4SyncScript';
  public static TRACE_INIT_EVENT = 'trackingFunctionsLoaded';
  public static TRACE_EXPERIENCE_INIT_EVENT = 'experienceFunctionsLoaded';

  private _isLoaded: Promise<boolean> = Promise.resolve(false);

  private _dataLayer: DataLayerTXP4;

  private _traceInitialized = false;
  private _traceExperienceInitialized = false;

  /**
   * Constructor for class
   * @param conf Tag manager configuration
   */
  constructor(conf?: TagManagerDriverConfiguration) {
    super(conf);
    this._dataLayer = {};
  }

  private remoteErrorLog(msg: string) {
    LoggerUtils.getInstance().error(msg, {
      remoteLogger: true,
      type: 'application'
    });
  }

  /**
   * Initializer for this tag manager driver
   * @param conf Configuration for the driver
   */
  setup(conf: TagManagerDriverConfiguration): void {
    conf && (this._config = { class: conf?.class });
    this.updateDataLayer({ pageInfo: { isIframe: isWebContainer() } });

    if (
      document.getElementById(TealiumTxP4Driver.TEALIUM_UTAG_SCRIPT_ID) &&
      document.getElementById(TealiumTxP4Driver.TEALIUM_UTAG_SYNC_SCRIPT_ID)
    ) {
      this._traceInitialized = true;
      this._traceExperienceInitialized = true;
      this._isLoaded = Promise.resolve(true);
    } else {
      this._isLoaded = this.initializeTealium().then((result) => result);
    }
  }

  /**
   * Check if bsSend is defined
   */
  private checkBsSend() {
    if (!window.bsSend && typeof window.bsSend !== 'function') {
      this.remoteErrorLog('[TealiumTxP4Driver] bsSend is not defined');
    }
  }

  /**
   * Check if bsSendExperience is defined
   */
  private checkBsSendExperience() {
    if (!window.bsSendExperience && typeof window.bsSendExperience !== 'function') {
      this.remoteErrorLog('[TealiumTxP4Driver] bsSendExperience is not defined');
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
      if (this._traceInitialized && loaded) {
        this.checkBsSend();

        this.updateDataLayer(tagRequest.data as Partial<DataLayerTXP4>);
        const type =
          this._dataLayer.event && this._dataLayer.event.toLowerCase().indexOf('view') > -1 ? 'view' : 'link';

        window.bsSend && window.bsSend(type, this._dataLayer);
        LoggerUtils.getInstance().debug('[TealiumTxP4Driver] [trace] data:', tagRequest.data, {
          remoteLogger: true,
          type: 'application'
        });
        const eventPayload = {
          method: 'tealiumTxTrace',
          data: this._dataLayer
        };
        EventManager.getInstance().publish('DEBUGGER_INFO', eventPayload);
        return { data: this._dataLayer as unknown as T };
      } else {
        if (loaded) {
          this.remoteErrorLog(
            `[TealiumTxP4Driver] [trace] driver is not properly initialized, bsSend method not initialized`
          );
        } else {
          this.remoteErrorLog(`[TealiumTxP4Driver] [trace] driver is not properly initialized, scripts not loaded`);
        }
      }
    } catch (e) {
      this.remoteErrorLog(`[TealiumTxP4Driver] [trace] driver error: ${e}`);
    }

    return { data: tagRequest.data };
  }

  /**
   * The function send the data object to remote experience server.
   * @param tagRequest tag request information
   * @returns {Promise<TagResponse<T>>} tag response
   */
  public async traceExperience<T>(tagRequest: TagRequest<T>): Promise<TagResponse<unknown>> {
    try {
      const loaded = await this._isLoaded;
      if (this._traceExperienceInitialized && loaded) {
        this.checkBsSendExperience();

        this.updateDataLayer(tagRequest.data as Partial<DataLayerTXP4>);

        const bsSendExperienceResponse: unknown = window.bsSendExperience && window.bsSendExperience(this._dataLayer);
        LoggerUtils.getInstance().debug('[TealiumTxP4Driver] [traceExperience] data:', tagRequest.data, {
          remoteLogger: true,
          type: 'application'
        });
        const eventPayload = {
          method: 'tealiumTxTraceExperience',
          data: this._dataLayer
        };
        EventManager.getInstance().publish('DEBUGGER_INFO', eventPayload);
        return { data: bsSendExperienceResponse as T };
      } else {
        if (loaded) {
          this.remoteErrorLog(
            `[TealiumTxP4Driver] [traceExperience] driver is not properly initialized, bsSendExperience method not initialized`
          );
        } else {
          this.remoteErrorLog(
            `[TealiumTxP4Driver] [traceExperience] driver is not properly initialized, scripts not loaded`
          );
        }
      }
    } catch (e) {
      this.remoteErrorLog(`[TealiumTxP4Driver] [traceExperience] driver error: ${e}`);
    }

    return { data: tagRequest.data };
  }

  /**
   * private function to inject the external Tealium library
   * The load is encapsulated into a promise to resolve only when the library is loaded
   * @returns {Promise<boolean>} boolean to indicate the initialization response
   */
  private async initializeTealium(): Promise<boolean> {
    document.addEventListener(TealiumTxP4Driver.TRACE_INIT_EVENT, () => {
      this._traceInitialized = true;
    });
    document.addEventListener(TealiumTxP4Driver.TRACE_EXPERIENCE_INIT_EVENT, () => {
      this._traceExperienceInitialized = true;
    });
    return new Promise((resolve) => {
      function resolveWithError(error: unknown, msg: string) {
        LoggerUtils.getInstance().error(`${msg} ${error}`, {
          remoteLogger: true,
          type: 'application'
        });
        resolve(false);
      }
      try {
        const environment = getEnvironment();
        const syncScriptElement = document.createElement('script');
        syncScriptElement.id = TealiumTxP4Driver.TEALIUM_UTAG_SYNC_SCRIPT_ID;
        syncScriptElement.src = TEALIUM_TX_P4_UTAG_SYNC_SRC[environment];
        syncScriptElement.type = 'text/javascript';
        syncScriptElement.async = true;

        appendElementScript(syncScriptElement, () => {
          const asyncScriptElement = document.createElement('script');
          asyncScriptElement.id = TealiumTxP4Driver.TEALIUM_UTAG_SCRIPT_ID;
          asyncScriptElement.src = TEALIUM_TX_P4_UTAG_SRC[environment];
          asyncScriptElement.type = 'text/javascript';
          asyncScriptElement.async = true;
          this._config &&
            this._config.class &&
            this._config.class.forEach((c: string) => asyncScriptElement.classList.add(c));
          appendElementScript(asyncScriptElement, () => {
            resolve(true);
          }).catch((error) => resolveWithError(error, '[TealiumTxP4Driver] utag script failed to load'));
        }).catch((error) => resolveWithError(error, '[TealiumTxP4Driver] utag sync script failed to load'));
      } catch (error) {
        resolveWithError(error, '[TealiumTxP4Driver] tag manager cannot be initialized');
      }
    });
  }

  private cleanObject<T extends Record<string, unknown>>(obj: T): T {
    for (const key in obj) {
      const value = obj[key];
      if (typeof value === 'object' && value !== null) {
        this.cleanObject(value as Record<string, unknown>);
        if (Object.keys(value).length === 0) {
          delete obj[key];
        }
      }
      if (value === undefined) {
        delete obj[key];
      }
    }
    return obj;
  }

  public updateDataLayer(data: Partial<DataLayerTXP4>) {
    this._dataLayer = {
      globalInfo: this._dataLayer.globalInfo,
      userInfo: {
        numper: this._dataLayer?.userInfo?.numper
      },
      pageInfo: {
        screenName: this._dataLayer?.pageInfo?.screenName,
        isIframe: this._dataLayer?.pageInfo?.isIframe
      },
      eventInfo: {
        deeplink: {
          deep_link_url: this._dataLayer?.eventInfo?.deeplink?.deep_link_url,
          deep_link_origin: this._dataLayer?.eventInfo?.deeplink?.deep_link_origin
        }
      }
    };
    this.cleanObject(this._dataLayer);
    this._dataLayer = this.deepMerge(this._dataLayer, data);
  }

  public flushDataLayer() {
    this._dataLayer = {};
  }

  private isObject(value: unknown): boolean {
    return typeof value === 'object' && value !== null;
  }

  private deepMerge<T>(target: T, source: Partial<T>): T {
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        this.mergeKey(target, source, key);
      }
    }
    return target;
  }

  private mergeKey<T>(target: T, source: Partial<T>, key: keyof T): void {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (this.isObject(sourceValue)) {
      if (!this.isObject(targetValue)) {
        target[key] = Array.isArray(sourceValue) ? ([] as T[keyof T]) : ({} as T[keyof T]);
      }
      this.deepMerge(target[key], sourceValue as Partial<T[keyof T]>);
    } else {
      target[key] = sourceValue as T[keyof T];
    }
  }

  public setBSMAnalyticsData(analytics: Partial<DataLayerTXP4>) {
    this.updateDataLayer(analytics);
  }
}
