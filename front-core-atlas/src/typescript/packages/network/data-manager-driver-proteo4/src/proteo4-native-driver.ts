/* eslint-disable @typescript-eslint/no-explicit-any */
import { DATA_MANAGER_ERROR, GenericDriver } from '@proteo/data-manager-driver';
import { repeatRequestError, convertLegacyToP4Errors } from '@proteo/data-manager-utils';
import { EventManager } from '@proteo/event-bus';
import { KeepAlive } from '@proteo/keep-alive';
import { LoggerUtils } from '@proteo/logger-utils';
import type {
  AvailableDrivers,
  BridgeRequest,
  DataManagerRequest,
  DataManagerRequestContainer,
  DataManagerResponse,
  DataManagerResponseErrors,
  NativeApiResponse,
  HttpMethod,
  DriverInterceptor,
  DriverConfiguration,
  DataManagerResponseError,
  NativeApiNestedResponse,
  DataManagerExtendedRequest
} from '@proteo/types';
import { createUUID } from '@proteo/uuid-utils';
import { I18n } from '@proteo/i18n-utils';
import type { Proteo4Driver } from './proteo4-driver.js';
import { DynatraceTracker } from '@proteo/dynatrace-utils';

const OK_STATUS_THRESHOLD = 200;
const ERROR_STATUS_THRESHOLD = 400;

/**
 * Banc Sabadell Mobile Proteo4 API driver implementation. This driver
 * communicates with native layer on a event-based communication.
 * This driver uses the native layer for performing the HTTP request
 */
export class Proteo4NativeDriver extends GenericDriver {
  /**
   * Driver interceptors
   */
  protected interceptors: DriverInterceptor[] = [];

  /**
   * Stored requests
   */
  protected storedRequests: Map<string, DataManagerRequestContainer> = new Map();

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
    return this.cleanErrorsHttp({ ...request, requestId: createUUID() }, false);
  }

  protected async cleanErrorsHttp<T>(
    request: DataManagerExtendedRequest,
    omitTransformError: boolean
  ): Promise<DataManagerResponse<T>> {
    KeepAlive.getInstance().keepAlive();

    const headers = this.parent.getHeaders(request.headers || {}, request.method);
    request.headers = headers;

    this.basicHttpOperations(request, headers, 'proteo4-native-driver');
    request.interceptors = [...this.interceptors];
    request.driverName = this.currentApi;

    return await this.resolveHttp(request, omitTransformError);
  }

  protected async resolveHttp<T>(
    request: DataManagerExtendedRequest,
    omitTransformError: boolean
  ): Promise<DataManagerResponse<T>> {
    const dtHeaders = DynatraceTracker.startNativeHttpTracking({
      url: request.processedUrl || '',
      frameworkName: 'Proteo4 Native driver',
      requestId: request.requestId as string
    });

    const headers = { ...request.headers, ...dtHeaders };

    const data: BridgeRequest = {
      method: 'httpRequest',
      data: {
        path: request.processedUrl,
        method: request.method,
        headers,
        params: request.params,
        driverType: 'P4' as AvailableDrivers,
        // Legacy BSM native implementation expects body as string
        body: JSON.stringify(request.data, null, 0)
      }
    };
    const response: NativeApiResponse<T> = await EventManager.getInstance().publishWithResponse<NativeApiResponse<T>>(
      'HTTP',
      data
    );
    return await this.cleanErrorsDone<T>(response, request, omitTransformError);
  }

  /**
   * Parse the native response and convert into a fetch response
   * @param response Response from http request
   * @param request Data manager request
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  async done<T>(response: Response, request: DataManagerRequest): Promise<DataManagerResponse<T>> {
    return this.cleanErrorsDone(response, request, false);
  }

  protected async cleanErrorsDone<T>(
    nativeResponse: unknown,
    request: DataManagerExtendedRequest,
    omitTransformError: boolean
  ): Promise<DataManagerResponse<T>> {
    let bridgeResponse: NativeApiResponse<T>;
    // Check request validity for different parsing
    const { response, ...rest } = nativeResponse as NativeApiResponse<T>;
    if ((nativeResponse as NativeApiResponse<T>).response) {
      bridgeResponse = { ...rest, ...(response as NativeApiNestedResponse<T>) };
    } else {
      bridgeResponse = nativeResponse as NativeApiResponse<T>;
    }
    LoggerUtils.getInstance().debug(`[DataManager Proteo4 Native driver] Response from bridge: ${bridgeResponse}`);
    const interceptorOmitsTransform = this.processResponseInterceptors(request, bridgeResponse);
    this.manageNativeErrors(bridgeResponse);
    if (bridgeResponse.status >= OK_STATUS_THRESHOLD && bridgeResponse.status < ERROR_STATUS_THRESHOLD) {
      return this.doneSuccessCase<T>(bridgeResponse, response as T, request);
    } else {
      const finalOmitTransform = interceptorOmitsTransform || omitTransformError;
      throw await this.doneErrorCase<T>(bridgeResponse, request, finalOmitTransform);
    }
  }

  private doneSuccessCase<T>(
    bridgeResponse: NativeApiResponse<T>,
    response: T,
    request: DataManagerExtendedRequest
  ): DataManagerResponse<T> {
    try {
      const { body, data, metadata, status, statusText, headers, pagination, customization, messages } = bridgeResponse;
      let dmResponse: DataManagerResponse<T>;
      // TODO: deprecate when userInfo comes inside a data or body
      if (!body && !data) {
        dmResponse = {
          data: response,
          metadata,
          status,
          statusText,
          headers,
          redirected: false,
          url: '',
          pagination,
          customization,
          messages
        };
      } else {
        dmResponse = {
          data: body ? (body as T) : data,
          metadata,
          status,
          statusText,
          headers,
          redirected: false,
          url: '',
          pagination,
          customization,
          messages
        };
      }
      this.responseReceivedLog(request, dmResponse, 'proteo4-native-driver');
      return dmResponse;
    } finally {
      DynatraceTracker.finishNativeHttpTracking(request.requestId as string);
    }
  }

  private async doneErrorCase<T>(
    bridgeResponse: NativeApiResponse<T>,
    request: DataManagerExtendedRequest,
    omitTransformError: boolean
  ) {
    const data = { ...bridgeResponse.body, ...bridgeResponse.data };
    const { status, statusText, headers } = bridgeResponse;
    const dmResponse: DataManagerResponse<T> = {
      data: {
        messages: convertLegacyToP4Errors(
          bridgeResponse.messages ? bridgeResponse.messages : (data as DataManagerResponseErrors).messages
        ),
        ...data
      } as DataManagerResponseErrors,
      status,
      statusText: statusText ? statusText : 'Internal Server Error',
      headers,
      redirected: false,
      url: ''
    };

    let statusCodeToReport = dmResponse.status || 500;
    let messageToReport: unknown = dmResponse.statusText;

    try {
      const errorThrown =
        this.hasCustomError || omitTransformError
          ? dmResponse.data
          : await (this.parent as Proteo4Driver).translateError(
              dmResponse.data as unknown as DataManagerResponseErrors,
              headers,
              request.options?.sendError
            );
      const errorToSend = { ...dmResponse, data: errorThrown };
      messageToReport = errorToSend.data || dmResponse.statusText;
      document.dispatchEvent(new CustomEvent<string>(DATA_MANAGER_ERROR, { detail: JSON.stringify(errorToSend) }));
      this.responseReceivedLog(request, dmResponse, 'proteo4-native-driver');

      return errorToSend;
    } catch (internalException: unknown) {
      messageToReport =
        internalException instanceof Error ? internalException.message : 'Excepción interna en DataManager';
      statusCodeToReport = 500;

      throw internalException;
    } finally {
      DynatraceTracker.finishNativeHttpTracking(request.requestId as string, {
        statusCode: statusCodeToReport,
        message: messageToReport
      });
    }
  }

  private manageNativeErrors<T>(bridgeResponse: NativeApiResponse<T>): void {
    if (bridgeResponse.error) {
      bridgeResponse.messages = [
        {
          alias: 'Native error',
          message: bridgeResponse.error,
          type: 'ERROR'
        }
      ];
    }
  }

  /**
   * Download File request using polling system
   * @param request data manager request
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  async downloadFile<T>(request: DataManagerRequest): Promise<DataManagerResponse<T>> {
    return this.parent.downloadFile(request);
  }

  /**
   * Generate the headers for the request with Proteo4 native mandatory headers
   * @param headers Initial request headers
   * @param method Request method
   * @returns {Record<string, string>} Joined request headers
   */
  getHeaders(headers: Record<string, string>, _method: HttpMethod): Record<string, string> {
    headers['accept-language'] = I18n.getInstance().isoLanguage;
    headers['content-language'] = I18n.getInstance().language;
    return headers;
  }

  protected processResponseInterceptors<T>(
    request: DataManagerExtendedRequest,
    response: NativeApiResponse<T>
  ): boolean {
    if (!request.interceptors) {
      return false;
    }
    const triggeredInterceptors = request.interceptors.filter((interceptor) => interceptor.code === response.status);
    let shouldOmitErrorTransform = false;
    triggeredInterceptors.forEach((interceptor) => {
      const body: Record<string, unknown> = { ...response };
      if (interceptor.repeat) {
        const requestID = createUUID();
        const { interceptors: _i, driverName: _d, requestId: _r, ...requestToStore } = request;

        response.headers['intercepted-request-id'] = requestID;
        body.requestID = requestID;

        this.storedRequests.set(requestID, { driverName: request.driverName as string, request: requestToStore });
      }
      // Uses strict false check to skip interceptor if value is undefined, null or zero
      if (interceptor.errorTranslate === false) {
        shouldOmitErrorTransform = true;
      }
      EventManager.getInstance().publish(interceptor.event, body);
    });
    return shouldOmitErrorTransform;
  }

  async repeatRequest<T>(requestID: string): Promise<DataManagerResponse<T>> {
    const nativeRequestContainer = this.storedRequests.get(requestID);
    if (!nativeRequestContainer) {
      LoggerUtils.getInstance().warn(`repeatRequest - request not found by given id: ${requestID}`, {
        remoteLogger: true,
        type: 'application'
      });
      return { data: { messages: repeatRequestError as DataManagerResponseError[] } } as DataManagerResponse<T>;
    }
    KeepAlive.getInstance().keepAlive();
    return this.resolveHttp(nativeRequestContainer.request, false);
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
