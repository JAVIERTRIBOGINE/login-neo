import { LoggerUtils } from '@proteo/logger-utils';
import { type ICMSHeadless, CMSHeadlessContentPaths, type CMSHeadlessConfig, type BaseAppConfig } from '@proteo/types';
import { ACCESS_TOKEN } from './constants.js';

export class CmsHeadless implements ICMSHeadless {
  /**
   * Main config for CMSHeadless related to the proteo architecture
   */
  private readonly _config!: CMSHeadlessConfig;
  /**
   * Main path for CMSHeadless
   */
  private _path: CMSHeadlessContentPaths = CMSHeadlessContentPaths.Literal;
  /**
   * Private toke to access to CMSHeadless private paths
   */
  private readonly _token: string = ACCESS_TOKEN;

  constructor(config?: CMSHeadlessConfig) {
    LoggerUtils.getInstance().info(`[CMDHeadless] Constructor Config: ` + JSON.stringify(config), {
      remoteLogger: true,
      type: 'application'
    });

    if (config) {
      this._config = config;
      this._token = this._config.TOKEN || ACCESS_TOKEN;
    } else {
      LoggerUtils.getInstance().error('[CMDHeadless] no config passed to the configuration.', {
        remoteLogger: true,
        type: 'application'
      });
    }
  }

  /**
   * Init instance os CMS Headless
   * @param config : BaseAppConfig
   */
  public static async initInstance(config?: BaseAppConfig): Promise<void> {
    if (!window.BsCmsHeadless) {
      if (config?.CMS_HEADLESS_CONFIG) {
        const instance = new CmsHeadless(config.CMS_HEADLESS_CONFIG);
        window.BsCmsHeadless = instance;
      } else {
        LoggerUtils.getInstance().error(`[CMDHeadless] Can't create CMS Headless without config`);
      }
    } else {
      LoggerUtils.getInstance().debug(`[CMDHeadless] The instance already exists`);
    }
  }

  /**
   * Get CMSHeadless instance
   */
  public static getInstance(): CmsHeadless {
    if (!window.BsCmsHeadless) {
      CmsHeadless.initInstance();
    }
    return window.BsCmsHeadless;
  }

  /**
   * Fetch content from CMSHeadless
   * @param flag : string => search flag
   * @param lang : Language of the search
   * @param path : CMSHeadlessContentPaths => optional path, default path /literal
   * @returns Fetch Result
   */
  public async fetchLocalizedContent(
    flag: string,
    lang: string,
    path: CMSHeadlessContentPaths = CMSHeadlessContentPaths.Literal
  ): Promise<unknown> {
    this._path = path;
    const url = `${this._config.ENDPOINT}${this._path}?lang=${lang}?path=${flag}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this._token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error fetching localized content: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      LoggerUtils.getInstance().error(
        `[CMDHeadless] Error fetching localized content from path: ${this._path} with locale: ${lang}`,
        error
      );
      throw error;
    }
  }
}
