import { GenericDriver } from '@proteo/data-manager-driver';
import { LoggerUtils } from '@proteo/logger-utils';
import { getCookie } from '@proteo/cookie-utils';
import { isJxBrowser, isMobile, isNative, isWebContainer } from '@proteo/platform-utils';
import {
  TRANSLATE_ERROR_ENDPOINT,
  type DataManagerRequest,
  type DataManagerResponse,
  type DataManagerResponseError,
  type DataManagerResponseErrors,
  type DriverConfiguration,
  type HttpMethod,
  type DownloadLinkResponse,
  type DownloadLinkResponseError,
  type AuthorizationTokens,
  type DataManagerRequestContainer,
  type DriverInterceptor,
  type SendErrorOptions
} from '@proteo/types';
import { Proteo4NativeDriver } from './proteo4-native-driver.js';
import { Proteo4WebDriver } from './proteo4-web-driver.js';
import {
  classifyErrors,
  convertLegacyToP4Errors,
  legacyGenericErrors,
  validateErrorFormat
} from '@proteo/data-manager-utils';
import { sendError, type ErrorManagementPayload } from '@proteo/error-management-utils';

const INTERNAL_SERVER_ERROR = 'Internal Server Error';

export class Proteo4Driver extends GenericDriver {
  /**
   * Driver interceptors
   */
  protected interceptors: DriverInterceptor[] = [];

  /**
   * Stored requests
   */
  protected storedRequests: Map<string, DataManagerRequestContainer> = new Map();

  private remoteDebug(message: string): void {
    LoggerUtils.getInstance().debug(message, {
      remoteLogger: true,
      type: 'application'
    });
  }

  /**
   * Constructor for class
   * @param config Driver configuration
   */
  constructor(config?: DriverConfiguration) {
    super(config, false);
    if (isNative()) {
      this.remoteDebug('Using PROTEO 4 driver with NATIVE implementation');
      this.instance = new Proteo4NativeDriver(config, this);
    } else {
      this.remoteDebug('Using PROTEO 4 driver with WEB implementation');
      this.instance = new Proteo4WebDriver(config, this);
    }
  }

  /**
   * Set authorization tokens into closure method for data manager
   * @param authorizationTokens Authorization tokens object
   * @returns {void}
   */
  setAuthorization(authorizationTokens: AuthorizationTokens): void {
    this.remoteDebug(`[Proteo4Driver] Setting authorization to driver instance: ${authorizationTokens}`);
    this.instance.setAuthorization(authorizationTokens);
  }

  /**
   * Clear authorization tokens for data manager
   * @returns {void}
   */
  clearTokens(): void {
    this.instance.clearTokens();
  }

  /**
   * Returns if the app has tokens or not
   * @returns {boolean}
   */
  hasTokens() {
    return this.instance.getHasTokens;
  }

  /**
   * Generate the headers for the request with Proteo4 mandatory headers
   * @param headers Initial request headers
   * @param method Request method
   * @returns {Record<string, string>} Joined request headers
   */
  getHeaders(headers: Record<string, string>, method: HttpMethod) {
    this.manageClientProductHeader(headers);
    this.manageDeviceTokenCookieHeader(headers);
    this.manageChannelOriginHeader(headers);
    headers = super.getHeaders(headers, method);
    return this.instance.getHeaders(headers, method);
  }

  private manageClientProductHeader(headers: Record<string, string>): void {
    let clientProduct = undefined;
    if (isWebContainer()) {
      clientProduct = 'BSO';
    }
    if (isNative()) {
      clientProduct = 'BSM';
    }
    if (clientProduct) {
      headers['x-client-product'] = clientProduct;
    }
  }

  private manageDeviceTokenCookieHeader(headers: Record<string, string>): void {
    const deviceTokenCookie = getCookie('DeviceTokenCookie');
    if (deviceTokenCookie) {
      headers['x-device-token-cookie'] = deviceTokenCookie;
    }
  }

  private manageChannelOriginHeader(headers: Record<string, string>): void {
    let channelOrigin = 'WEB';
    if (isJxBrowser()) {
      channelOrigin = 'BRANCH';
    }
    if (isMobile()) {
      channelOrigin = 'MOBILE';
    }
    headers['x-channel-origin'] = channelOrigin;
  }

  /**
   * Download File request using polling system
   * @param request data manager request
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  async downloadFile<T>(request: DataManagerRequest): Promise<DataManagerResponse<T>> {
    const defaultError: DataManagerResponseErrors = {
      messages: [
        {
          alias: INTERNAL_SERVER_ERROR,
          message: INTERNAL_SERVER_ERROR,
          type: 'ERROR'
        }
      ]
    };

    if (!request.channel) {
      LoggerUtils.getInstance().error('Channel parameter not provided', {
        remoteLogger: true,
        type: 'application'
      });
      return Promise.reject(defaultError);
    }
    request.headers = { ...request.headers, 'x-p4-channel': request.channel };
    delete request.channel;

    if (request.contentType) {
      request.headers = { ...request.headers, 'Content-Type': request.contentType, Accept: request.contentType };
      delete request.contentType;
    }

    try {
      const { data } = await this.http(request);
      const downloadLink = (data as DownloadLinkResponse).downloadLink;
      return await this.downloadPolling<T>(request, downloadLink, defaultError);
    } catch {
      LoggerUtils.getInstance().error(INTERNAL_SERVER_ERROR, {
        remoteLogger: true,
        type: 'application'
      });
      return Promise.reject(defaultError);
    }
  }

  private async downloadPolling<T>(
    request: DataManagerRequest,
    downloadLink: string,
    defaultError: DataManagerResponseErrors
  ): Promise<DataManagerResponse<T>> {
    const interval = 1000;
    let maxtries = 100;
    let toContinue = true;

    while (toContinue && maxtries > 0) {
      try {
        const downloadRequest: DataManagerRequest = {
          url: downloadLink,
          method: 'GET',
          headers: request.headers
        };
        const response: DataManagerResponse<T> = await this.http(downloadRequest);

        const contentDisposition = response.headers['content-disposition'];
        const regex = /(["])(.*?)\1/g;
        const filterContentDisposition = contentDisposition ? contentDisposition.match(regex) : null;
        const fileName: string | null =
          filterContentDisposition && filterContentDisposition[0]
            ? filterContentDisposition[0].replace(/['"]+/g, '')
            : null;

        if (typeof response.data === 'object' && response.data !== null && !Array.isArray(response.data)) {
          response.data = { fileName, ...response.data } as T;
        } else {
          response.data = { fileName, data: response.data } as T;
        }

        return response;
      } catch (error) {
        const e = error as DataManagerResponse<DownloadLinkResponseError>;
        const alias = e && e.data ? e.data.messages[0].alias : '';
        switch (alias) {
          case 'downloadLinkBrokenException':
            this.remoteDebug('[downloadFile] downloadLinkBrokenException');
            toContinue = false;
            break;
          case 'downloadLinkExpiredException':
            this.remoteDebug('[downloadFile] downloadLinkExpiredException');
            toContinue = false;
            break;
          case 'downloadLinkAlreadyVisited':
            this.remoteDebug('[downloadFile] downloadLinkAlreadyVisited');
            toContinue = false;
            break;
          case 'downloadLinkNotProvisioned':
            this.remoteDebug('[downloadFile] downloadLinkNotProvisioned');
            await new Promise((resolve) => {
              setTimeout(resolve, interval);
            });
            maxtries -= 1;
            break;
          default:
            this.remoteDebug(`[downloadFile] unexpected error code: '${alias}'`);
            toContinue = false;
            break;
        }
      }
    }
    LoggerUtils.getInstance().error(INTERNAL_SERVER_ERROR, {
      remoteLogger: true,
      type: 'application'
    });
    return Promise.reject(defaultError);
  }

  /**
   * Repeat stored request if found
   * @param requestID Data manager request ID
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  repeatRequest<T>(requestID: string): Promise<DataManagerResponse<T>> {
    return this.instance.repeatRequest(requestID);
  }

  /**
   * Deletes stored request if found
   * @param requestID Data manager request ID
   * @returns {boolean} If the request was found and deleted
   */
  deleteRequest(requestID: string): boolean {
    return this.instance.deleteRequest(requestID);
  }

  /**
   * Retrieves stored request if found
   * @param requestID Data manager request ID
   * @returns {DataManagerRequestContainer | undefined} The stored request if found
   */
  getRequest(requestID: string): DataManagerRequestContainer | undefined {
    return this.instance.getRequest(requestID);
  }

  /**
   * Filters the field title from DataManagerResponseErrors, it is not supported by translate error API
   * @param errors array of errors to send to translate error API
   * @returns filtered errors
   */
  filterTranslateErrorNotAllowedFields(errors: DataManagerResponseError[]) {
    errors.forEach((error: DataManagerResponseError) => {
      error.title = undefined;
    });
    return errors;
  }

  private checkSendErrorPropagate(
    errorResponse: DataManagerResponseErrors,
    sendErrorOptions?: SendErrorOptions
  ): boolean {
    if (!sendErrorOptions) {
      return true;
    }
    const { propagate, excludedAliases } = sendErrorOptions;

    if (!excludedAliases || excludedAliases.length === 0) {
      return propagate;
    }

    const exceptions = new Set(excludedAliases);
    const matchFound = errorResponse.messages.some((message) => exceptions.has(message.alias));

    return matchFound ? !propagate : propagate;
  }

  private composeLegacyGenericErrors(originalErrors: DataManagerResponseError[]): ErrorManagementPayload[] {
    const baseError = legacyGenericErrors[0];
    const originalAlias = originalErrors[0]?.alias;
    return [{ ...baseError, code: originalAlias || baseError.code }];
  }

  /**
   * Translates Z errors inside a P4 response and sends them
   * @param errorResponse response containing errors
   * @param headers headers to make the translation request
   * @returns {DataManagerResponseErrors} Proteo error format
   */
  async translateError(
    errorResponse: DataManagerResponseErrors,
    headers: Record<string, string>,
    sendErrorOptions?: SendErrorOptions
  ): Promise<DataManagerResponseErrors> {
    if (!validateErrorFormat(errorResponse)) {
      return { messages: convertLegacyToP4Errors(legacyGenericErrors) };
    }

    const classifiedErrors = this.instance.translateAllErrors
      ? [errorResponse.messages, []]
      : classifyErrors(errorResponse);

    const errorsToTranslate = classifiedErrors[0] || [];
    const preservedErrors = classifiedErrors[1] || [];

    if (!errorsToTranslate.length) {
      return { messages: preservedErrors };
    }

    let legacyErrorsToSend: ErrorManagementPayload[] = this.composeLegacyGenericErrors(errorsToTranslate);

    try {
      if (this.hasDriverConfig(window.BsTranslateErrorDriver)) {
        this.setupByName(window.BsTranslateErrorDriver);

        const response = await this.http({
          url: TRANSLATE_ERROR_ENDPOINT,
          method: 'POST',
          headers,
          data: this.filterTranslateErrorNotAllowedFields(errorsToTranslate)
        });

        if (response?.data) {
          legacyErrorsToSend = response.data as ErrorManagementPayload[];
        }
      } else {
        LoggerUtils.getInstance().error('[translateError] No proper error translation config was found.', {
          remoteLogger: true,
          type: 'application'
        });
        LoggerUtils.getInstance().debug(
          '[translateError] Source error could not be translated (No Driver)',
          errorsToTranslate
        );
      }
    } catch {
      LoggerUtils.getInstance().debug(
        '[translateError] Source error could not be translated (HTTP Error)',
        errorsToTranslate
      );
    }

    if (this.checkSendErrorPropagate(errorResponse, sendErrorOptions)) {
      sendError(legacyErrorsToSend);
    }

    const p4FormattedErrors = convertLegacyToP4Errors(legacyErrorsToSend);
    return { messages: [...p4FormattedErrors, ...preservedErrors] };
  }
}
