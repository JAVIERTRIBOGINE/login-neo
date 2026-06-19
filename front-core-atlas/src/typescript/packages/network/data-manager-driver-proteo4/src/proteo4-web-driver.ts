import { DATA_MANAGER_ERROR, GenericDriver, REFRESH_RETRIES } from '@proteo/data-manager-driver';
import { repeatRequestError } from '@proteo/data-manager-utils';
import { I18n } from '@proteo/i18n-utils';
import { KeepAlive } from '@proteo/keep-alive';
import { LoggerUtils } from '@proteo/logger-utils';
import type {
  DataManagerRequest,
  DataManagerResponseErrors,
  HttpMethod,
  DataManagerResponse,
  DriverConfiguration,
  DriverInterceptor,
  DataManagerRequestContainer,
  DataManagerResponseError,
  DataManagerExtendedRequest
} from '@proteo/types';
import { EventManager } from '@proteo/event-bus';
import { createUUID } from '@proteo/uuid-utils';
import type { Proteo4Driver } from './proteo4-driver.js';

const REQUEST_WAIT_TIMER = 500;

/**
 * Proteo 4 Driver for performing HTTP requests to Proteo 4 API
 * Uses headers for security
 */
export class Proteo4WebDriver extends GenericDriver {
  /**
   * Counter to manager refresh requests
   */
  protected REFRESH_COUNTER = 0;

  /**
   * Driver interceptors
   */
  protected interceptors: DriverInterceptor[] = [];

  /**
   * Stored requests
   */
  protected storedRequests: Map<string, DataManagerRequestContainer> = new Map();

  /**
   * Refresh token status control
   */
  protected refreshTokenProcess = false;

  constructor(config: DriverConfiguration | undefined, parent: GenericDriver) {
    super(config);
    if (config?.interceptors) {
      config.interceptors.forEach((interceptor: DriverInterceptor) => {
        this.interceptors.push(interceptor);
      });
    }
    if (parent) {
      this.parent = parent;
    }
  }

  /**
   * HTTP Request Method implementation for driver
   * @param request Request object with information (url, params, headers, etc.)
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  async http<T>(request: DataManagerRequest): Promise<DataManagerResponse<T>> {
    return await this.cleanErrorsHttp<T>(request, false);
  }

  protected async cleanErrorsHttp<T>(
    request: DataManagerExtendedRequest,
    omitTransformError: boolean
  ): Promise<DataManagerResponse<T>> {
    KeepAlive.getInstance().keepAlive();

    const headers = this.parent.getHeaders(request.headers || {}, request.method);

    if (request.data instanceof FormData) {
      request.processedBody = request.data;
    } else {
      request.processedBody = JSON.stringify(request.data);
      headers['Content-Type'] = 'application/json';
    }

    this.basicHttpOperations(request, headers, 'proteo4-web-driver');
    request.interceptors = [...this.interceptors];
    request.driverName = this.currentApi;

    return this.resolveHttp<T>(request, omitTransformError);
  }

  protected async resolveHttp<T>(
    request: DataManagerExtendedRequest,
    omitTransformError: boolean
  ): Promise<DataManagerResponse<T>> {
    let response: Response;
    if (this.refreshTokenProcess) {
      await new Promise((resolve) => {
        setTimeout(resolve, REQUEST_WAIT_TIMER);
      });
      return this.resolveHttp<T>(request, omitTransformError);
    }
    const headers = this.parent.getHeaders(request.headers || {}, request.method);
    const body = request.processedBody;
    if (!(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    try {
      response = await fetch(request.processedUrl as string, {
        method: request.method,
        headers,
        body,
        credentials: 'include',
        redirect: request.options?.redirect ?? 'follow'
      });
      return await this.cleanErrorsDone<T>(response, request, omitTransformError);
    } catch (error: unknown) {
      document.dispatchEvent(
        new CustomEvent<string>(DATA_MANAGER_ERROR, { detail: JSON.stringify((error as DataManagerResponse<T>).data) })
      );
      throw error as DataManagerResponseErrors;
    }
  }

  /**
   * Parse for response
   * @param response Response from http request
   * @param request Data manager request
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  async done<T>(response: Response, request: DataManagerRequest): Promise<DataManagerResponse<T>> {
    return await this.cleanErrorsDone<T>(response, request, false);
  }

  protected async cleanErrorsDone<T>(
    response: Response,
    request: DataManagerExtendedRequest,
    omitTransformError: boolean
  ): Promise<DataManagerResponse<T>> {
    // TODO: add content-type validation if the API defines a list of possibles mime response types
    // Convert fetch response to proteo 4 response
    const { status, statusText, headers, redirected, url } = response;
    const proteoHeaders: Record<string, string> = {};
    headers.forEach((value, key) => (proteoHeaders[key] = value));
    const proteoResponse: DataManagerResponse<T> = { status, statusText, redirected, url, headers: proteoHeaders };
    const interceptorOmitsTransform = await this.processResponseInterceptors(request, response, proteoResponse);
    if (response.ok) {
      return await this.doneSuccessCase<T>(response, proteoResponse, request);
    } else {
      const finalOmitTransform = interceptorOmitsTransform || omitTransformError;
      return await this.doneErrorCase<T>(response, proteoResponse, request, finalOmitTransform);
    }
  }

  private async doneSuccessCase<T>(
    response: Response,
    proteoResponse: DataManagerResponse<T>,
    request: DataManagerRequest
  ) {
    this.REFRESH_COUNTER = 0;
    try {
      const json = await response.json();
      proteoResponse.data = json.data ? json.data : json;
      proteoResponse.metadata = json.metadata;
      proteoResponse.pagination = json.pagination;
      proteoResponse.customization = json.customization;
      proteoResponse.messages = json.messages;
    } catch (e) {
      LoggerUtils.getInstance().debug('Data Manager Correct request without body: ', e, {
        remoteLogger: true,
        type: 'application'
      });
    }
    this.responseReceivedLog(request, proteoResponse, 'proteo4-web-driver');
    return proteoResponse;
  }

  private async doneErrorCase<T>(
    response: Response,
    proteoResponse: DataManagerResponse<T>,
    request: DataManagerRequest,
    omitTransformError: boolean
  ) {
    try {
      const json = await response.json();
      // START: expired token validation
      if (
        json.messages.length &&
        json.messages[0].alias === 'TOKEN_EXPIRED' &&
        this.REFRESH_COUNTER < REFRESH_RETRIES
      ) {
        if (this.refreshTokenProcess) {
          return await this.resolveHttp<T>(request, omitTransformError);
        }
        this.refreshTokenProcess = true;
        const { refreshTokens } = await import('@proteo/refresh-tokens-utils');
        try {
          const authorizationTokens = await refreshTokens();
          this.setAuthorization(authorizationTokens);
        } catch (e) {
          LoggerUtils.getInstance().debug('Data Manager refresh token error: ', e, {
            remoteLogger: true,
            type: 'application'
          });
        }
        this.refreshTokenProcess = false;
        proteoResponse.data = json;
        this.REFRESH_COUNTER++;
        return await this.resolveHttp<T>(request, omitTransformError);
      }
      // END: expired token validation
      proteoResponse.data = json;
    } catch (e) {
      LoggerUtils.getInstance().debug('Data Manager Middleware error without body: ', e, {
        remoteLogger: true,
        type: 'application'
      });
    }
    const translateErrorHeaders = this.parent.getHeaders(request.headers || {}, request.method);
    const errorThrown =
      this.hasCustomError || omitTransformError
        ? proteoResponse.data
        : await (this.parent as Proteo4Driver).translateError(
            proteoResponse.data as DataManagerResponseErrors,
            translateErrorHeaders,
            request.options?.sendError
          );
    const errorToSend = { ...proteoResponse, data: errorThrown };
    this.responseReceivedLog(request, proteoResponse, 'proteo4-web-driver');
    document.dispatchEvent(new CustomEvent<string>(DATA_MANAGER_ERROR, { detail: JSON.stringify(errorToSend) }));
    throw errorToSend;
  }

  /**
   * Generate the headers for the request with Proteo4 web mandatory headers
   * @param headers Initial request headers
   * @param method Request method
   * @returns {Record<string, string>} Joined request headers
   */
  getHeaders(headers: Record<string, string>, method: HttpMethod): Record<string, string> {
    headers['accept-language'] = I18n.getInstance().isoLanguage;
    if (method === 'POST') {
      headers['content-language'] = I18n.getInstance().language;
    }
    LoggerUtils.getInstance().debug('[Proteo4WebDriver] authorizationTokens: ', this.authorizationTokens, {
      remoteLogger: true,
      type: 'application'
    });
    headers['authorization'] = `Bearer ${this.authorizationTokens.OAUTH}`;
    headers['x-auth'] = this.authorizationTokens.OIDC;
    return headers;
  }

  /**
   * Download File request using polling system
   * @param request data manager request
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  async downloadFile<T>(request: DataManagerRequest): Promise<DataManagerResponse<T>> {
    return this.parent.downloadFile(request);
  }

  protected async processResponseInterceptors<T>(
    request: DataManagerExtendedRequest,
    response: Response,
    proteoResponse: DataManagerResponse<T>
  ): Promise<boolean> {
    if (!request.interceptors) {
      return false;
    }
    const triggeredInterceptors = request.interceptors.filter((interceptor) => interceptor.code === response.status);
    let shouldOmitErrorTransform = false;
    if (triggeredInterceptors.length > 0) {
      const responseClone = response.clone();
      let responseJson = { data: {} };
      try {
        responseJson = await responseClone.json();
      } catch {
        LoggerUtils.getInstance().warn('[Proteo4WebDriver] intercepted request without proper body');
      }
      triggeredInterceptors.forEach((interceptor) => {
        if (interceptor.repeat) {
          const requestID = createUUID();
          const { interceptors: _i, driverName: _d, requestId: _r, ...requestToStore } = request;

          responseJson.data = { ...responseJson.data, requestID };
          proteoResponse.headers['intercepted-request-id'] = requestID;

          this.storedRequests.set(requestID, { driverName: request.driverName as string, request: requestToStore });
        }
        // Uses strict false check to skip interceptor if value is undefined, null or zero
        if (interceptor.errorTranslate === false) {
          shouldOmitErrorTransform = true;
        }
        EventManager.getInstance().publish(interceptor.event, responseJson.data);
      });
    }
    return shouldOmitErrorTransform;
  }

  async repeatRequest<T>(requestID: string): Promise<DataManagerResponse<T>> {
    const requestContainer = this.storedRequests.get(requestID);
    if (!requestContainer) {
      LoggerUtils.getInstance().warn(`repeatRequest - request not found by given id: ${requestID}`, {
        remoteLogger: true,
        type: 'application'
      });
      return { data: { messages: repeatRequestError as DataManagerResponseError[] } } as DataManagerResponse<T>;
    }
    KeepAlive.getInstance().keepAlive();
    return this.resolveHttp(requestContainer.request, false);
  }

  deleteRequest(requestID: string): boolean {
    if (!this.storedRequests.get(requestID)) {
      LoggerUtils.getInstance().warn(`deleteRequest - request not found by given id: ${requestID}`, {
        remoteLogger: true,
        type: 'application'
      });
    }
    return this.storedRequests.delete(requestID);
  }

  getRequest(requestID: string): DataManagerRequestContainer | undefined {
    const requestContainer: DataManagerRequestContainer | undefined = this.storedRequests.get(requestID);
    if (requestContainer === undefined) {
      LoggerUtils.getInstance().warn(`getRequest - request not found by given id: ${requestID}`, {
        remoteLogger: true,
        type: 'application'
      });
    }
    return requestContainer;
  }
}
