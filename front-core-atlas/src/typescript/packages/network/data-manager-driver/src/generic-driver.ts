import type {
  BaseOptions,
  DataManagerRequest,
  DataManagerRequestContainer,
  DataManagerResponse,
  DataManagerResponseErrors,
  DriverConfiguration
} from '@proteo/types';
import { DataManagerDriver } from './data-manager-driver.js';
import { LoggerUtils } from '@proteo/logger-utils';
import { getParams } from '@proteo/data-manager-utils';

/**
 * Http Driver for performing HTTP requests and returning
 * Data manager responses
 */
export class GenericDriver extends DataManagerDriver {
  constructor(config?: DriverConfiguration, callsetup = true) {
    super(config, callsetup);
  }

  protected basicHttpOperations(request: DataManagerRequest, headers: Record<string, string>, driverName: string) {
    request.processedUrl = request.url;
    if (this.baseURL) {
      request.processedUrl = this.getUrl(request.processedUrl);
    }

    if (request.queryParams) {
      request.processedUrl = `${request.processedUrl}?${getParams(request.queryParams)}`;
    }

    if (!request.processedUrl.includes('/logs/access') && !request.processedUrl.includes('/logs/application')) {
      // Emit access log REQUEST-SENT
      LoggerUtils.getInstance().info(
        'REQUEST-SENT',
        {
          remoteLogger: true,
          type: 'access',
          url: request.processedUrl,
          method: request.method,
          headers
        },
        { driver: driverName }
      );
    }
  }

  protected responseReceivedLog<T>(
    request: DataManagerRequest,
    response: DataManagerResponse<T>,
    driverName: string
  ): void {
    if (!request.processedUrl?.includes('/logs/access') && !request.processedUrl?.includes('/logs/application')) {
      // Emit access log RESPONSE-RECEIVED
      LoggerUtils.getInstance().info(
        'RESPONSE-RECEIVED',
        {
          remoteLogger: true,
          type: 'access',
          url: request.url,
          method: request.method,
          status: response.status
        },
        { driver: driverName }
      );
    }
  }

  /**
   * HTTP Request Method implementation for driver
   * @param request Request object with information (url, params, headers, etc.)
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  async http<T>(request: DataManagerRequest): Promise<DataManagerResponse<T>> {
    this.validateOptions(request);
    return this.instance.http(request);
  }

  private validateOptions(request: DataManagerRequest): void {
    if (request.options?.redirect) {
      request.options.redirect =
        typeof request.options.redirect === 'string' && ['follow', 'manual', 'error'].includes(request.options.redirect)
          ? request.options.redirect
          : 'follow';
    }
  }

  /**
   * Parse for response
   * @param response Response from http request
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  async done<T>(
    response: Response | DataManagerResponse<T>,
    request?: DataManagerRequest
  ): Promise<DataManagerResponse<T>> {
    return this.instance.done(response, request);
  }

  protected logErrorOnlyP4Driver(): void {
    LoggerUtils.getInstance().error(
      'This function is only for using PROTEO 4 driver with WEB implementation or NATIVE implementation',
      {
        remoteLogger: true,
        type: 'application'
      }
    );
  }

  protected rejectOnlyP4Driver<T>(): Promise<DataManagerResponse<T>> {
    this.logErrorOnlyP4Driver();
    const errors: DataManagerResponseErrors = {
      messages: [
        {
          alias: 'Internal Server Error',
          message: 'Internal Server Error',
          type: 'ERROR'
        }
      ]
    };
    return Promise.reject(errors);
  }

  /**
   * Download File request using polling system
   * @param request data manager request
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  downloadFile<T>(_request: DataManagerRequest): Promise<DataManagerResponse<T>> {
    return this.rejectOnlyP4Driver();
  }

  /**
   * Repeat stored request if found
   * @param requestID Data manager request ID
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  repeatRequest<T>(_requestID: string): Promise<DataManagerResponse<T>> {
    return this.rejectOnlyP4Driver();
  }

  /**
   * Deletes stored request if found
   * @param requestID Data manager request ID
   * @returns {boolean} If the request was found and deleted
   */
  deleteRequest(_requestID: string): boolean {
    this.logErrorOnlyP4Driver();
    return false;
  }

  /**
   * Retrieves stored request if found
   * @param requestID Data manager request ID
   * @returns {DataManagerRequest | undefined} The stored request if found
   */
  getRequest(_requestID: string, options?: BaseOptions): DataManagerRequestContainer | undefined {
    !options?.ignoreLogs && this.logErrorOnlyP4Driver();
    return undefined;
  }
}
