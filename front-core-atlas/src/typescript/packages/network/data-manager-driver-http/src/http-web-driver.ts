import { DATA_MANAGER_ERROR, GenericDriver } from '@proteo/data-manager-driver';
import { KeepAlive } from '@proteo/keep-alive';
import { LoggerUtils } from '@proteo/logger-utils';
import type { DataManagerRequest, DataManagerResponse } from '@proteo/types';

/**
 * Proteo 4 Driver for performing HTTP requests to Proteo 4 API
 * Uses headers for security
 */
export class HttpWebDriver extends GenericDriver {
  /**
   * HTTP Request Method implementation for driver
   * @param request Request object with information (url, params, headers, etc.)
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  async http<T>(request: DataManagerRequest): Promise<DataManagerResponse<T>> {
    KeepAlive.getInstance().keepAlive();

    let response: Response;
    const headers = this.getHeaders(request.headers || {}, request.method);

    this.basicHttpOperations(request, headers, 'http-web-driver');

    try {
      // TODO: implement request timeout http://factory.bancsabadell.com/browse/EA-1727
      response = await fetch(`${request.processedUrl}`, {
        method: request.method,
        headers,
        body: this.isUrlFormEncoded(headers)
          ? new URLSearchParams(request.data as Record<string, string>)
          : JSON.stringify(request.data),
        credentials: 'include',
        redirect: request.options?.redirect ?? 'follow'
      });
      return await this.done<T>(response);
    } catch (error: unknown) {
      document.dispatchEvent(new CustomEvent<string>(DATA_MANAGER_ERROR, { detail: error as string }));
      throw error;
    }
  }

  /**
   * Returns true if the header content type is configured as url form encoded
   * @param headers request headers
   * @returns true if it's url form encoded, false otherwise
   */
  public isUrlFormEncoded(headers: Record<string, string>): boolean {
    const header = headers['Content-Type'] || headers['content-type'];
    return header ? header.indexOf('x-www-form-urlencoded') >= 0 : false;
  }

  /**
   * Parse for response
   * @param response Response from http request
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  async done<T>(response: Response): Promise<DataManagerResponse<T>> {
    // Convert fetch response to data manager response
    const { status, statusText, headers, url, redirected } = response;
    const objectHeaders: Record<string, string> = {};
    headers.forEach((value, key) => (objectHeaders[key] = value));
    const dataManagerResponse: DataManagerResponse<T> = { status, statusText, headers: objectHeaders, url, redirected };

    if (response.ok) {
      try {
        const json = await response.json();
        dataManagerResponse.data = json as T;
      } catch (e) {
        LoggerUtils.getInstance().debug('Data Manager Correct request without body: ', e, {
          remoteLogger: true,
          type: 'application'
        });
      }
      if (!response.url.includes('/logs/access') && !response.url.includes('/logs/application')) {
        // Emit access log RESPONSE-RECEIVED
        LoggerUtils.getInstance().info(
          'RESPONSE-RECEIVED',
          {
            remoteLogger: true,
            type: 'access',
            url: response.url,
            method: 'notAvailable',
            headers: objectHeaders,
            response: dataManagerResponse
          },
          { driver: 'http-driver' }
        );
      }
      return dataManagerResponse;
    } else {
      try {
        const json = await response.json();
        dataManagerResponse.data = json as T;
      } catch (e) {
        LoggerUtils.getInstance().debug('Data Manager Middleware error without body: ', e, {
          remoteLogger: true,
          type: 'application'
        });
      }
      document.dispatchEvent(
        new CustomEvent<string>(DATA_MANAGER_ERROR, { detail: JSON.stringify(dataManagerResponse) })
      );
      // TODO: Emit access log RESPONSE-RECEIVED with the error
      throw dataManagerResponse;
    }
  }
}
