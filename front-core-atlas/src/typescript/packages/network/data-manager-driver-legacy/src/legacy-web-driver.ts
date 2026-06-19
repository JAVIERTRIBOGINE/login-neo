import { GenericDriver } from '@proteo/data-manager-driver';
import { EventManager } from '@proteo/event-bus';
import { KeepAlive } from '@proteo/keep-alive';
import { LoggerUtils } from '@proteo/logger-utils';
import type {
  BridgeRequest,
  DataManagerRequest,
  DataManagerResponse,
  DataManagerResponseErrors,
  HttpMethod,
  NetiResponseError
} from '@proteo/types';

const INTERNAL_SERVER_ERROR = 'Internal Server Error';
const ERROR_FORBIDDEN_CODE = 403;
const ERROR_INTERNAL_CODE = 500;

/**
 * Banc Sabadell Online driver implementation for NETiAsApi support
 * This driver uses fetch API to perform HTTP requests and review the
 * response object for obtaining the errors
 */
export class LegacyWebDriver extends GenericDriver {
  /**
   * HTTP Request Method implementation for driver
   * @param request Request object with information (url, params, headers, etc.)
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  async http<T>(request: DataManagerRequest): Promise<DataManagerResponse<T>> {
    KeepAlive.getInstance().keepAlive();

    if (this.baseURL) {
      request.url = this.getUrl(request.url);
    }

    const headers = this.getHeaders(request.headers || {}, 'POST');

    if (!request.url.includes('/logs/access') && !request.url.includes('/logs/application')) {
      // Emit access log REQUEST-SENT
      LoggerUtils.getInstance().info(
        'REQUEST-SENT',
        {
          remoteLogger: true,
          type: 'access',
          url: request.url,
          method: request.method,
          headers
        },
        { driver: 'legacy-web-driver' }
      );
    }

    const data: BridgeRequest = {
      method: 'httpRequest',
      data: {
        path: request.url,
        method: 'POST',
        body: request.data || {},
        params: request.queryParams,
        headers
      }
    };
    const response: DataManagerResponse<T> = await EventManager.getInstance().publishWithResponse<
      DataManagerResponse<T>
    >('HTTP', data);
    return await this.done<T>(response);
  }

  /**
   * Checks if the content of the NETi response is valid
   * @param response Data Manager Response
   * @returns {boolean} true if it's an error response, false otherwise
   */
  private isErrorResponse<T>(response: DataManagerResponse<T>): boolean {
    return !!response.data && typeof response.data === 'object' && 'errorCode' in response.data;
  }

  /**
   * Checks if the content type header of the NETi response is valid
   * @param response Data Manager Response
   * @returns {boolean} true if it's an error response, false otherwise
   */
  private isValidContentType<T>(response: DataManagerResponse<T>): boolean {
    const contentType = response.headers['content-type'];
    if (contentType) {
      return contentType.toLowerCase().indexOf('html') < 0;
    } else {
      return false;
    }
  }

  /**
   * Parse for response
   * @param response Response from http request
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  async done<T>(response: DataManagerResponse<T>): Promise<DataManagerResponse<T>> {
    // NETiAsApi always returns 200 responses (response.ok always will return true)
    if (this.isErrorResponse(response) && response.data) {
      const errorResponse = { ...response };
      errorResponse.status = ERROR_INTERNAL_CODE;
      errorResponse.statusText = INTERNAL_SERVER_ERROR;
      errorResponse.data = this.convertToError<T>(response.data as T);
      // TODO: Emit access log RESPONSE-RECEIVED with error
      throw errorResponse;
    }

    // NETiAsApi could return non json responses (html for example). This should be converted into a forbidden request
    if (!this.isValidContentType(response)) {
      const forbiddenResponse = { ...response };
      forbiddenResponse.status = ERROR_FORBIDDEN_CODE;
      forbiddenResponse.statusText = 'Forbidden';
      // TODO: Emit access log RESPONSE-RECEIVED with error
      throw forbiddenResponse;
    }

    // Emit access log RESPONSE-RECEIVED
    LoggerUtils.getInstance().info('RESPONSE-RECEIVED', {
      remoteLogger: true,
      type: 'access',
      url: 'notAvailable',
      method: 'notAvailable',
      headers: {},
      response
    });
    return response;
  }

  /**
   * Convert a NETi response into a Proteo4 error
   * @param data neti response (error)
   * @returns {DataManagerResponseErrors} Proteo error format
   */
  private convertToError<T>(data: T): DataManagerResponseErrors {
    return {
      messages: [
        {
          title: (data as unknown as NetiResponseError).errorMessageTitle,
          alias: (data as unknown as NetiResponseError).errorCode,
          message: (data as unknown as NetiResponseError).errorMessage,
          type: 'ERROR'
        }
      ]
    };
  }

  /**
   * NETi As Api does not need additional headers
   * @param headers Initial request headers
   * @param _method Request method
   * @returns {Record<string, string>} Initial request headers
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getHeaders(headers: Record<string, string>, _method: HttpMethod): Record<string, string> {
    headers = super.getHeaders(headers, _method);
    headers['content-type'] = 'application/json;charset=UTF-8';
    return headers;
  }
}
