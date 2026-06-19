import { DATA_MANAGER_ERROR, GenericDriver } from '@proteo/data-manager-driver';
import { convertLegacyToP4Errors } from '@proteo/data-manager-utils';
import { EventManager } from '@proteo/event-bus';
import { KeepAlive } from '@proteo/keep-alive';
import { LoggerUtils } from '@proteo/logger-utils';
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
 * Banc Sabadell Mobile API driver implementation. This driver
 * communicates with native layer on a event-based communication.
 * This driver uses the native layer for performing the HTTP request
 */
export class LegacyNativeDriver extends GenericDriver {
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

    const headers = this.getHeaders(request.headers || {}, request.method);

    if (!request.data) {
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
        { driver: 'legacy-native-driver' }
      );
    }

    const data: BridgeRequest = {
      method: 'httpRequest',
      data: {
        path: request.url,
        method: request.method,
        params: request.queryParams,
        headers,
        driverType: 'LEGACY' as AvailableDrivers,
        // Legacy BSM native implementation expects body as string
        body: JSON.stringify(request.data, null, 0)
      }
    };
    const response: NativeApiResponse<T> = await EventManager.getInstance().publishWithResponse<NativeApiResponse<T>>(
      'HTTP',
      data
    );
    return await this.done<T>(response);
  }

  /**
   * Parse the native response and convert into a fetch response
   * @param response Response from http request
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  async done<T>(nativeResponse: unknown): Promise<DataManagerResponse<T>> {
    if ((nativeResponse as NativeApiResponse<T>).response) {
      const { response, ...rest } = nativeResponse as NativeApiResponse<T>;
      nativeResponse = { ...rest, ...(response as NativeApiNestedResponse<T>) };
    }
    const { body, status, statusText, headers } = nativeResponse as NativeApiResponse<T>;
    let dmResponse: DataManagerResponse<T> = {
      data: body as T,
      status,
      statusText,
      headers,
      redirected: false,
      url: ''
    };

    // Check request validity
    if (dmResponse.status >= OK_STATUS_THRESHOLD && dmResponse.status < ERROR_STATUS_THRESHOLD) {
      // Emit access log RESPONSE-RECEIVED
      LoggerUtils.getInstance().info(
        'RESPONSE-RECEIVED',
        {
          remoteLogger: true,
          type: 'access',
          url: 'notAvailable',
          method: 'notAvailable',
          headers,
          response: dmResponse
        },
        { driver: 'legacy-web-driver' }
      );
      return dmResponse;
    } else {
      LoggerUtils.getInstance().debug('[Proteo4-DataManager] LEGACY driver error response', nativeResponse, {
        remoteLogger: true,
        type: 'application'
      });
      const errorResponse = body ? { ...body } : { ...(nativeResponse as ErrorManagementPayload) };
      dmResponse = {
        data: { messages: convertLegacyToP4Errors([errorResponse as ErrorManagementPayload]) },
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
