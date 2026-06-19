import Rox from 'rox-browser';
import type { RoxFetcherStatus } from 'rox-browser';
import type { RoxFetcherResult as IRoxFetcherResult } from 'rox-browser';
import type { IFeatureManager, FeatureManagerFlag } from '@proteo/types';
import { LoggerUtils } from '@proteo/logger-utils';

const FLAG_DEFAULT_VALUE = 'NOT_FOUND_FLAG';

export const ROX_FETCHER_STATUS = {
  AppliedFromEmbedded: 'APPLIED_FROM_EMBEDDED',
  AppliedFromCache: 'APPLIED_FROM_CACHE',
  AppliedFromNetwork: 'APPLIED_FROM_NETWORK',
  ErrorFetchFailed: 'ERROR_FETCH_FAILED'
} as const satisfies Record<
  keyof typeof RoxFetcherStatus,
  `${(typeof RoxFetcherStatus)[keyof typeof RoxFetcherStatus]}`
>;

/**
 * Class representing the Feature Manager.
 */
export class FeatureManager implements IFeatureManager {
  /**
   * Driver instances
   * @private
   */
  private readonly _driversMap = new Map<string, string>();

  /**
   * Gets the singleton instance of the Feature Manager.
   * @returns The singleton instance of the Feature Manager.
   */
  public static getInstance(): FeatureManager {
    if (!window.BsFeatureManager) {
      window.BsFeatureManager = new FeatureManager();
    }
    return window.BsFeatureManager;
  }

  /**
   * Registers a new feature manager with the given name and key.
   * @param name - The name of the feature manager.
   * @param key - The key for the feature manager.
   * @returns A promise that resolves when the registration is complete.
   */
  public async register(name: string, key: string): Promise<void> {
    const clientId = this.checkExistClientId(key);

    if (!this._driversMap.has(name) && !clientId) {
      this._driversMap.set(name, key);
    } else {
      LoggerUtils.getInstance().info(`ℹ️ [Feature Manager] This key is already registered with name: [ ${clientId} ]`);
    }
    await this.use(name);
  }

  /**
   * Uses the feature manager with the given name.
   * @param name - The name of the feature manager.
   * @returns A promise that resolves when the feature manager is ready to use.
   */
  public async use(name: string): Promise<void> {
    const namespace = this._driversMap.get(name);
    try {
      if (namespace) {
        await Rox.setup(namespace, { configurationFetchedHandler: this.createFetchHandler.bind(this) });
      } else {
        LoggerUtils.getInstance().info(
          'ℹ️ [Feature Manager] This project name does not exist. Register before calling this function'
        );
      }
    } catch (error) {
      LoggerUtils.getInstance().error(`❌ [Feature Manager] Error crítico e inesperado en setup: ${error}`, {
        remoteLogger: true,
        type: 'application'
      });
    }
  }

  /**
   * Gets the value of a feature flag.
   * @param name - The name of the feature flag.
   * @param opts - The options for the feature flag.
   * @returns The value of the feature flag in string.
   */
  public value(name: string, opts: FeatureManagerFlag): string {
    if (!opts.defaultValue && opts.defaultValue !== '') {
      opts.defaultValue = FLAG_DEFAULT_VALUE;
    }
    return Rox.dynamicApi.value(name, opts.defaultValue, opts.context);
  }

  private createFetchHandler(fetchResult: IRoxFetcherResult) {
    const handlers = {
      [ROX_FETCHER_STATUS.AppliedFromNetwork]: () => {
        LoggerUtils.getInstance().info(
          '✅ [Feature Manager] Configuración descargada y aplicada con éxito desde el servidor.'
        );
      },
      [ROX_FETCHER_STATUS.AppliedFromCache]: () => {
        LoggerUtils.getInstance().warn(
          '⚠️ [Feature Manager] Sin conexión de red fresca. Se aplicó la configuración guardada en caché.'
        );
      },
      [ROX_FETCHER_STATUS.AppliedFromEmbedded]: () => {
        LoggerUtils.getInstance().warn(
          '⚠️ [Feature Manager] Sin conexión ni caché. Se aplicaron los valores embebidos (hardcodeados en código).'
        );
      },
      [ROX_FETCHER_STATUS.ErrorFetchFailed]: () => {
        LoggerUtils.getInstance().error(
          `❌ [Feature Manager] El fetch de configuración falló por completo. Detalles: ${fetchResult.errorDetails}`,
          {
            remoteLogger: true,
            type: 'application'
          }
        );
      }
    } as const;
    handlers[fetchResult.fetcherStatus as RoxFetcherStatus]();
  }

  /**
   * Checks if a client ID already exists in the drivers map.
   * @param clientId - The client ID to check.
   * @returns The name associated with the client ID if it exists, otherwise an empty string.
   * @private
   */
  private checkExistClientId(clientId: string): string {
    for (const [key, value] of this._driversMap.entries()) {
      if (value === clientId) {
        return key;
      }
    }
    return '';
  }
}
