import { LoggerUtils } from '@proteo/logger-utils';
import type { BaseConfig, LoaderConf } from '@proteo/types';
/**
 * Configuration Loader implementation. It Loads the global configuration for an app.
 * It accepts to override the default config, for example to indicate the host or config path for a mFe
 */
export class ConfigLoader {
  private static readonly DEFAULT_HOST = '';
  private static readonly DEFAULT_CONFIG_PATH = 'conf/';
  private static readonly DEFAULT_CONFIG_FILE = 'env.json';
  private static readonly DEFAULT_RUNTIME_FILE = 'runtime.json';
  private static readonly CONFIG_CACHE = new Map<string, Promise<unknown>>();

  /**
   * Process the whole fetch responses returning its JSON value
   */
  private static async fetchConfig<T extends BaseConfig>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) {
      LoggerUtils.getInstance().warn(`Could not load config file ${url}: ${res.statusText}`, {
        remoteLogger: true,
        type: 'application'
      });
      return {} as T;
    }
    return res.json() as Promise<T>;
  }

  private static mapConfigFilesToUrls(conf: LoaderConf): string[] {
    const host = conf.HOST || this.DEFAULT_HOST;
    const path = conf.CONFIG_BASE_PATH || this.DEFAULT_CONFIG_PATH;
    const files = (conf.CONFIG_FILE_NAMES || []).concat(this.DEFAULT_CONFIG_FILE, this.DEFAULT_RUNTIME_FILE);
    return files.map((file) => host + path + file);
  }

  /**
   * Fetch for all the config files returning a merged object.
   * It will load each file in order merging it with the previous config.
   * The default config file env.json will have value preference
   */
  static async retrieveAllGlobalConfig<T extends BaseConfig>(conf?: LoaderConf): Promise<T> {
    const files = this.mapConfigFilesToUrls(conf || {});
    const configs = await Promise.all(
      files.map((url) => this.getCachedOrLoadConfig<T>(url, async () => this.fetchConfig<T>(url)))
    );
    return configs.reduce((acc, conf) => ({ ...acc, ...conf }), {} as T);
  }

  static getCachedOrLoadConfig<T>(key: string, loader: () => Promise<T>): Promise<T> {
    if (this.CONFIG_CACHE.has(key)) {
      return this.CONFIG_CACHE.get(key) as Promise<T>;
    }
    const loadPromise = loader();
    this.CONFIG_CACHE.set(key, loadPromise);
    return loadPromise;
  }

  static clearCache(): void {
    this.CONFIG_CACHE.clear();
  }
}
