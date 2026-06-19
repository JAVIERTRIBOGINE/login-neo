import type {
  AuthorizationTokens,
  DataManagerRequest,
  DataManagerResponse,
  DataManagerResponseError,
  DataManagerResponseErrors,
  ErrorSeverity,
  HttpMethod
} from './data-manager.js';

/**
 * Global setup for Data Manager
 */
export interface DriverConfiguration {
  /**
   * Base host for HTTP Requests (ex. http://api.foo.bar)
   */
  host: string;

  /**
   * Base url for HTTP Requests (ex. /api/v1)
   */
  baseUrl: string;

  /**
   * Application name
   */
  name: string;

  /**
   * Custom Error flag
   */
  hasCustomError?: boolean;

  /**
   * Translate all errors flag
   */
  translateAllErrors?: boolean;

  /**
   * Request timeout
   */
  requestTimeout?: number;

  /**
   * Interceptors config
   */
  interceptors?: DriverInterceptor[];
}

export interface DriverInterceptor {
  /**
   * Response code to intercept
   */
  code: number;

  /**
   * Event to send when intercepting code
   */
  event: string;

  /**
   * Check to determine if the request has to be stored to enable a repeated call
   */
  repeat?: boolean;

  /**
   * Determines whether the response has to be translated after triggering the interceptor. Defaults to true
   */
  errorTranslate?: boolean;
}

/**
 * Data manager Driver definition. HTTP implementation
 */
export interface IDataManagerDriver {
  /**
   * Set authorization tokens into closure method for data manager
   * @param authorizationTokens Authorization tokens object
   * @returns {void}
   */
  setAuthorization(authorizationTokens: AuthorizationTokens): void;

  /**
   * Clear authorization tokens for data manager
   * @returns {void}
   */
  clearTokens(): void;

  /**
   * Returns if the app has tokens or not
   * @returns {boolean}
   */
  get getHasTokens(): boolean;

  /**
   * Initializer for this http driver
   * @param conf Configuration for the driver
   */
  setup(config?: DriverConfiguration): void;

  /**
   * Add api to set driver
   * @param config Driver config containing API
   * @returns {void}
   */
  addAPI(config: DriverConfiguration): void;

  /**
   * HTTP Request
   * @param request data manager request
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  http<T>(request: DataManagerRequest): Promise<DataManagerResponse<T>>;

  /**
   * Parse for response
   * @param response Response from http request
   * @param request Data manager request
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  done<T>(response: Response | unknown, request?: DataManagerRequest): Promise<DataManagerResponse<T>>;

  /**
   * Generate the headers for the request with Proteo4 mandatory headers
   * @param headers Initial request headers
   * @param method Request method
   * @returns {Record<string, string>} Joined request headers
   */
  getHeaders(headers: Record<string, string>, method: HttpMethod): Record<string, string>;

  /**
   * Has P4 Custom error
   * @returns {boolean} Has Custom Error
   */
  hasCustomError?: boolean;

  /**
   * Download File request using polling system
   * @param request data manager request
   * @returns {Promise<DataManagerResponse<T>>} Response for this request
   */
  downloadFile<T>(request: DataManagerRequest): Promise<DataManagerResponse<T>>;
}

export interface IP4DataManagerDriver extends IDataManagerDriver {
  /**
   * Set authorization tokens into closure method for data manager
   * @param error Data manager response error
   * @param headers Request Headers
   * @param hasCustomError Custom error flag
   * @returns {Promise<DataManagerResponseErrors>}
   */
  translateError(
    error: DataManagerResponseErrors,
    headers: Record<string, string>,
    hasCustomError: boolean
  ): Promise<DataManagerResponseErrors>;
}

/**
 * @deprecated Fields already included in DataManagerResponse, use DataManagerResponse instead
 */
export interface Proteo4Response<T> extends DataManagerResponse<T> {
  /**
   * Pagination object
   */
  pagination?: Proteo4Pagination;

  /**
   * Customization object
   */
  customization?: unknown;
}

/**
 * Proteo4 pagination object
 */
export interface Proteo4Pagination {
  /**
   * Pagination offset
   */
  offset: number;

  /**
   * Limit of records into pagination
   */
  limit: number;

  /**
   * Pagination page
   */
  page?: number;

  /**
   * Total pages
   */
  totalPages?: number;

  /**
   * Total elements
   */
  totalElements?: number;

  /**
   * Links information
   */
  links?: {
    /**
     * First page
     */
    first?: string;

    /**
     * Previous page
     */
    prev?: string;

    /**
     * Current page
     */
    self: string;

    /**
     * Next page
     */
    next?: string;

    /**
     * Last page
     */
    last?: string;
  };
}

/**
 * Neti Response Error
 */
export interface NetiResponseError {
  /**
   * Error message
   */
  errorMessage: string;

  /**
   * Error message title
   */
  errorMessageTitle: string;
  /**
   * Error message detail
   */
  errorMessageDetail: string;

  /**
   * Error code
   */
  errorCode: string;

  /**
   * Event name
   */
  evento: string;

  /**
   * Severity
   */
  severity: string;

  /**
   * Code information
   */
  code: string;

  /**
   * Channel identifier
   */
  idCanal: string;

  /**
   * Operative name
   */
  nombreOperativa: string;

  /**
   * Call To Action label
   */
  labelCta: string;

  /**
   * Call to Action operation
   */
  operationCta: string;

  /**
   * Click to call
   */
  clickToCall: string;
}

/**
 * Response from native
 */
export interface NativeApiResponse<T> {
  /**
   * Data of the response, body format
   */
  body?: T | NetiResponseError;

  /**
   * Data of the response, data format
   */
  data?: T | DataManagerResponseErrors;

  /**
   * Error messages for error response
   */
  messages?: DataManagerResponseError[];

  /**
   * Data of the response, sub-response format
   */
  response?: NativeApiNestedResponse<T> | string;

  /**
   * Metadata of the response
   */
  metadata?: unknown;

  /**
   * Status of the response
   */
  status: number;

  /**
   * Status text of the response
   */
  statusText: string;

  /**
   * Response headers
   */
  headers: Record<string, string>;

  /**
   * Pagination object
   */
  pagination?: Proteo4Pagination;

  /**
   * Customization object
   */
  customization?: unknown;

  /**
   * Native error
   */
  error?: string;
}

export interface NativeApiNestedResponse<T> {
  /**
   * Status of the response
   */
  status: number;

  /**
   * Data of the response
   */
  data?: T | DataManagerResponseErrors;

  /**
   * Data of the response
   */
  body?: T | NetiResponseError;

  /**
   * Error messages for error response
   */
  messages?: DataManagerResponseError[];

  /**
   * Response headers
   */
  headers: Record<string, string>;

  /**
   * Native error
   */
  error?: string;
}

/**
 * BsmApi Response Error
 */
export interface NativeApiResponseError {
  /**
   * Code information
   */
  code: string;

  /**
   * Error code
   */
  errorCode: string;

  /**
   * Error message
   */
  errorMessage: string;

  /**
   * Error message detail
   */
  errorMessageDetail: string;

  /**
   * Error message title
   */
  errorMessageTitle: string;

  /**
   * HTTP status
   */
  status: string;
}

/**
 * @deprecated not suitable for current functionality
 */
export interface P4ErrorResponse {
  data: P4ErrorObject[];
}

/**
 * Download Link Response
 */
export interface DownloadLinkResponse {
  /**
   * Identifier of your download process
   */
  downloadId: string;

  /**
   * Link that you must use to download the file in the next step
   */
  downloadLink: string;
}

/**
 * Download Link Response Error
 */
export interface DownloadLinkResponseError {
  /**
   * Array of error messages
   */
  messages: DownloadLinkErrorMessage[];
}

/**
 * Download Link Response Error Messages
 */
export interface DownloadLinkErrorMessage {
  /**
   * Alias of type error
   */
  alias: string;
  /**
   * Message of type error
   */
  message: string;
  /**
   * Type error
   */
  type: string;
}

/**
 * @deprecated Case completely covered with ErrorManagementPayload
 */
export interface P4ErrorObject {
  errorMessage: string;
  code: string;
  errorMessageTitle: string;
  errorMessageDetail: string;
  errorCode: string;
  severity: ErrorSeverity;
}

export const TRANSLATE_ERROR_ENDPOINT = '/translate';

export interface CheckAuthResponse {
  status: boolean;
}
