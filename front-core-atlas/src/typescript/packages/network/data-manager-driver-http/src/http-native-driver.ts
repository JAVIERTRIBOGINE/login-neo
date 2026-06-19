import { DATA_MANAGER_ERROR, GenericDriver } from '@proteo/data-manager-driver';
import { convertLegacyToP4Errors } from '@proteo/data-manager-utils';
import { EventManager } from '@proteo/event-bus';
import { KeepAlive } from '@proteo/keep-alive';
import type {
  AvailableDrivers,
  BridgeRequest,
  DataManagerRequest,
  DataManagerResponse,
  NativeApiNestedResponse,
  NativeApiResponse
} from '@proteo/types';
import type { ErrorManagementPayload } from '@proteo/error-management-utils';

const INTERNAL_SERVER_ERROR = 'Internal Server Error';
const OK_STATUS_THRESHOLD = 200;
const ERROR_STATUS_THRESHOLD = 400;

/**
 * Banc Sabadell Mobile Http API driver implementation. This driver
 * communicates with native layer on a event-based communication.
 * This driver uses the native layer for performing the HTTP request
 */
export class HttpNativeDriver extends GenericDriver {
  /**
   * HTTP Request Method implementation for driver
   * @param request Request object with information (url, params, headers, etc.)
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  async http<T>(request: DataManagerRequest): Promise<DataManagerResponse<T>> {
    KeepAlive.getInstance().keepAlive();

    const headers = this.getHeaders(request.headers || {}, request.method);

    this.basicHttpOperations(request, headers, 'http-native-driver');

    try {
      const data: BridgeRequest = {
        method: 'httpRequest',
        data: {
          path: request.processedUrl,
          method: request.method,
          headers,
          params: request.params,
          driverType: 'HTTP' as AvailableDrivers,
          // Legacy BSM native implementation expects body as string
          body: JSON.stringify(request.data, null, 0)
        }
      };
      const response: NativeApiResponse<T> = await EventManager.getInstance().publishWithResponse<NativeApiResponse<T>>(
        'HTTP',
        data
      );

      return await this.done<T>(response);
    } catch (error: unknown) {
      document.dispatchEvent(new CustomEvent<string>(DATA_MANAGER_ERROR, { detail: error as string }));
      throw error;
    }
  }

  /**
   * Parse the native response and convert into a fetch response
   * @param response Response from http request
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  async done<T>(nativeResponse: unknown): Promise<DataManagerResponse<T>> {
    let dmResponse: DataManagerResponse<T>;
    if ((nativeResponse as NativeApiResponse<T>).response) {
      const { response, ...rest } = nativeResponse as NativeApiResponse<T>;
      nativeResponse = { ...rest, ...(response as NativeApiNestedResponse<T>) };
    }
    if (
      (nativeResponse as NativeApiResponse<T>).status >= OK_STATUS_THRESHOLD &&
      (nativeResponse as NativeApiResponse<T>).status < ERROR_STATUS_THRESHOLD
    ) {
      const { body, status, statusText, headers } = nativeResponse as NativeApiResponse<T>;
      dmResponse = {
        data: body as T,
        status,
        statusText,
        headers,
        redirected: false,
        url: ''
      };
      return dmResponse;
    } else {
      const errorResponse: ErrorManagementPayload = nativeResponse as ErrorManagementPayload;
      dmResponse = {
        data: { messages: convertLegacyToP4Errors([errorResponse]) },
        status: (nativeResponse as NativeApiResponse<T>).status,
        statusText: INTERNAL_SERVER_ERROR,
        headers: {},
        redirected: false,
        url: ''
      };
      document.dispatchEvent(new CustomEvent<string>(DATA_MANAGER_ERROR, { detail: JSON.stringify(dmResponse) }));
      throw dmResponse;
    }
  }
}
