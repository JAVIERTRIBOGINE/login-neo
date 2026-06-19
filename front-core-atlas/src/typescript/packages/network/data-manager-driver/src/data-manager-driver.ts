import { combineURLs } from '@proteo/data-manager-utils';
import { LoggerUtils } from '@proteo/logger-utils';
import { EventManager } from '@proteo/event-bus';
import type {
  AuthorizationTokens,
  BaseOptions,
  CheckAuthResponse,
  DataManagerRequest,
  DataManagerRequestContainer,
  DataManagerRequestOptions,
  DataManagerResponse,
  DriverConfiguration,
  DriverInterceptor,
  HttpMethod,
  IDataManagerDriver
} from '@proteo/types';
import { createUUID } from '@proteo/uuid-utils';

/**
 * Abstract Driver implementation. Base utility for defining
 * drivers implementations
 */
export abstract class DataManagerDriver implements IDataManagerDriver {
  /**
   * Legacy driver this.instance. BsmApi for native environments and
   * NetiAsApi driver for legacy web environments
   */
  protected instance: DataManagerDriver;

  /**
   * Parent instance for native-web drivers
   */
  protected parent: DataManagerDriver;

  /**
   * Base URL for HTTP requests
   */
  protected baseURL = '';

  protected interceptors?: DriverInterceptor[];

  /**
   * API array
   */
  protected _apis: Map<string, DriverConfiguration> = new Map<string, DriverConfiguration>();

  /**
   * Base Custom error configuration
   */
  public hasCustomError = false;

  /**
   * Base general error translation configuration
   */
  public translateAllErrors = false;

  public currentApi = '';

  /**
   * Authorization tokens object
   */
  protected authorizationTokens: AuthorizationTokens = { OAUTH: '', OIDC: '' };

  constructor(config?: DriverConfiguration, callSetup = true) {
    this.instance = this;
    this.parent = this;
    if (config) {
      this.instance.addAPI(config);
    }
    if (callSetup) {
      this.instance.setup(config);
    }
  }

  /**
   * Add Driver APIs to existing driver
   * @param config Driver config containing API
   * @returns {void}
   */
  public addAPI(config: DriverConfiguration) {
    const existingApi = this.instance._apis.get(config.name);
    if (existingApi) {
      if (!this.apisHaveSameUrl(existingApi, config)) {
        LoggerUtils.getInstance().error(
          `[DataManager] Duplicated driver names with different urls are not allowed: ${config.name}`,
          {
            remoteLogger: true,
            type: 'application'
          }
        );
        return;
      }
      this.mergeInterceptorsIntoFirst(existingApi, config);
    } else {
      this.instance._apis.set(config.name, config);
    }
  }

  private apisHaveSameUrl(c1: DriverConfiguration, c2: DriverConfiguration): boolean {
    return c1.host === c2.host && c1.baseUrl === c2.baseUrl;
  }

  private mergeInterceptorsIntoFirst(c1: DriverConfiguration, c2: DriverConfiguration): void {
    const combined = [...(c1.interceptors ?? []), ...(c2.interceptors ?? [])];
    const seen = new Map<string, DriverInterceptor>();
    for (const item of combined) {
      const key = JSON.stringify(item);
      seen.set(key, item);
    }
    c1.interceptors = Array.from(seen.values());
  }

  /**
   * Set authorization tokens into closure method for data manager
   * @param authorizationTokens Authorization tokens object
   * @returns {void}
   */
  setAuthorization(authorizationTokens: AuthorizationTokens): void {
    LoggerUtils.getInstance().debug('[AbstractDriver] Storing authorization:', authorizationTokens, {
      remoteLogger: true,
      type: 'application'
    });
    this.instance.authorizationTokens = authorizationTokens;
  }

  /**
   * Has Tokens method for knowing if the app has tokens
   * @returns boolean indicating if the app has tokens stored
   */
  get getHasTokens(): boolean {
    return !!this.instance.authorizationTokens.OAUTH || !!this.instance.authorizationTokens.OIDC;
  }

  async hasNativeTokens(): Promise<boolean> {
    const payload = {
      method: 'checkAuth'
    };
    try {
      const response: CheckAuthResponse = await EventManager.getInstance().publishWithResponse<CheckAuthResponse>(
        'CHECK_AUTH',
        payload
      );
      return response.status;
    } catch (error) {
      LoggerUtils.getInstance().error(`[DataManager] hasNativeTokens: ${error}`, {
        remoteLogger: true,
        type: 'application'
      });
      return false;
    }
  }
  /**
   * Clear authorization tokens for data manager
   * @returns {void}
   */
  clearTokens(): void {
    this.instance.authorizationTokens = { OAUTH: '', OIDC: '' };
    LoggerUtils.getInstance().debug('[DataManager] clear authorization tokens');
  }

  /**
   * Function for getting the stored tokens for endSession and revoke
   * utilities from authorization
   * @returns Stored tokens
   */
  get getStoredTokens(): AuthorizationTokens {
    return this.instance.authorizationTokens;
  }

  /**
   * Initializer for this http driver
   * @param config Configuration for the driver
   * @param driverName Name of the driver owner of given configuration
   */
  setup(config?: DriverConfiguration, driverName?: string) {
    if (config) {
      this.instance.baseURL = combineURLs(config.host, config.baseUrl);
      this.instance.hasCustomError = !!config.hasCustomError;
      this.instance.translateAllErrors = !!config.translateAllErrors;
      this.instance.currentApi = driverName || '';
      this.instance.interceptors = config.interceptors;
    }
    try {
      new URL(this.instance.baseURL);
    } catch {
      LoggerUtils.getInstance().debug(`Data Manager base URL is empty or is not correct: '${this.baseURL}'`, {
        remoteLogger: true,
        type: 'application'
      });
    }
  }

  setupByName(driverName: string): void {
    if (this.instance._apis.has(driverName)) {
      this.instance.setup(this.instance._apis.get(driverName) as DriverConfiguration, driverName);
    } else {
      LoggerUtils.getInstance().debug(`Data Manager driver could not load given config: '${driverName}'`, {
        remoteLogger: true,
        type: 'application'
      });
    }
  }

  hasDriverConfig(driverName: string) {
    return this.instance._apis.has(driverName);
  }

  removeDriverConfig(driverName: string): number {
    if (this.instance._apis.has(driverName)) {
      this.instance._apis.delete(driverName);
    } else {
      LoggerUtils.getInstance().error(`Data Manager driver could not be found: '${driverName}'`, {
        remoteLogger: true,
        type: 'application'
      });
    }
    return this.instance._apis.size;
  }

  /**
   * Generate the request URL with data manager configuration and url parameter
   * @param url Request url
   * @returns {string} Request url
   */
  protected getUrl(url: string): string {
    try {
      new URL(url);
      return url;
    } catch {
      return combineURLs(this.instance.baseURL, url);
    }
  }

  /**
   * HTTP Request Method implementation for driver
   * @param request Request object with information (url, params, headers, etc.)
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  abstract http<T>(request: DataManagerRequest): Promise<DataManagerResponse<T>>;

  /**
   * Parse for response
   * @param response Response from http request
   * @param request Data manager request
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  abstract done<T>(response: Response | unknown, request?: DataManagerRequest): Promise<DataManagerResponse<T>>;

  /**
   * GET request using configured http instance
   * @param url Url to GET content
   * @param headers (optional) Headers to use for this request
   * @param queryParams (optional) Query parameters for the request
   * @param params (optional) Extra params for the request (just for BSM)
   * @param options (optional) Request options
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  public get<T>(
    url: string,
    headers?: Record<string, string>,
    queryParams?: Record<string, string>,
    params?: Record<string, string>,
    options?: DataManagerRequestOptions
  ): Promise<DataManagerResponse<T>> {
    return this.instance.http({ url, method: 'GET', headers, queryParams, params, options });
  }

  /**
   * POST request using configured http instance
   * @param url Url to GET content
   * @param data Data to send in request
   * @param headers (optional) Headers to use for this request
   * @param queryParams (optional) Query parameters for the request
   * @param options (optional) Request options
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  public post<T>(
    url: string,
    data: unknown,
    headers?: Record<string, string>,
    queryParams?: Record<string, string>,
    options?: DataManagerRequestOptions
  ): Promise<DataManagerResponse<T>> {
    return this.instance.http({ url, method: 'POST', data, headers, queryParams, options });
  }

  /**
   * PUT request using configured http instance
   * @param url Url to GET content
   * @param data Data to send in request
   * @param headers (optional) Headers to use for this request
   * @param queryParams (optional) Query parameters for the request
   * @param options (optional) Request options
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  public put<T>(
    url: string,
    data: unknown,
    headers?: Record<string, string>,
    queryParams?: Record<string, string>,
    options?: DataManagerRequestOptions
  ): Promise<DataManagerResponse<T>> {
    return this.instance.http({ url, method: 'PUT', data, headers, queryParams, options });
  }

  /**
   * PATCH request using configured http instance
   * @param url Url to GET content
   * @param data Data to send in request
   * @param headers (optional) Headers to use for this request
   * @param queryParams (optional) Query parameters for the request
   * @param options (optional) Request options
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  public patch<T>(
    url: string,
    data: unknown,
    headers?: Record<string, string>,
    queryParams?: Record<string, string>,
    options?: DataManagerRequestOptions
  ): Promise<DataManagerResponse<T>> {
    return this.instance.http({ url, method: 'PATCH', data, headers, queryParams, options });
  }

  /**
   * DELETE request using configured http instance
   * @param url Url to GET content
   * @param headers (optional) Headers to use for this request
   * @param params (optional) Query parameters for the request
   * @param options (optional) Request options
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  public delete<T>(
    url: string,
    headers?: Record<string, string>,
    params?: Record<string, string>,
    options?: DataManagerRequestOptions
  ): Promise<DataManagerResponse<T>> {
    return this.instance.http({ url, method: 'DELETE', headers, params, options });
  }

  /**
   * OPTIONS request using configured http instance
   * @param url Url to GET content
   * @param headers (optional) Headers to use for this request
   * @param queryParams (optional) Query parameters for the request
   * @param options (optional) Request options
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  public options<T>(
    url: string,
    headers?: Record<string, string>,
    queryParams?: Record<string, string>,
    options?: DataManagerRequestOptions
  ): Promise<DataManagerResponse<T>> {
    return this.instance.http({ url, method: 'OPTIONS', headers, queryParams, options });
  }

  /**
   * HEAD request using configured http instance
   * @param url Url to GET content
   * @param headers (optional) Headers to use for this request
   * @param queryParams (optional) Query parameters for the request
   * @param options (optional) Request options
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  public head<T>(
    url: string,
    headers?: Record<string, string>,
    queryParams?: Record<string, string>,
    options?: DataManagerRequestOptions
  ): Promise<DataManagerResponse<T>> {
    return this.instance.http({ url, method: 'HEAD', headers, queryParams, options });
  }

  /**
   * Generate the headers for the request with Proteo4 mandatory headers
   * @param headers Initial request headers
   * @param _method Request method
   * @returns {Record<string, string>} Joined request headers
   */
  getHeaders(headers: Record<string, string>, _method: HttpMethod): Record<string, string> {
    const headersCopy = JSON.parse(JSON.stringify(headers));
    if (!headersCopy['x-request-id']) headersCopy['x-request-id'] = createUUID();
    return headersCopy;
  }

  /**
   * Download file request using configured download file instance
   * @param request Data manager request
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  abstract downloadFile<T>(request: DataManagerRequest): Promise<DataManagerResponse<T>>;

  abstract repeatRequest<T>(requestID: string): Promise<DataManagerResponse<T>>;

  abstract deleteRequest(requestID: string): boolean;

  abstract getRequest(requestID: string, options?: BaseOptions): DataManagerRequestContainer | undefined;
}
