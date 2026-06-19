import type {
  DriverConfiguration,
  DriverInterceptor,
  IDataManagerDriver,
  Proteo4Pagination
} from './data-manager-drivers.js';

export type AvailableDrivers = 'P4' | 'LEGACY' | 'HTTP';

/**
 * Http methods supported by data manager
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'TRACE';

/**
 * Authentication tokens model
 */
export type AuthorizationTokens = {
  OIDC: string;
  OAUTH: string;
};

/**
 * Global setup for Data Manager
 */
export interface DataManagerConfiguration extends DriverConfiguration {
  /**
   * Driver instance for HTTP Requests
   */
  driver: IDataManagerDriver;
}

/**
 * HTTP response for data manager (extended from fetch response)
 */
export interface DataManagerResponse<T> {
  /**
   * Response data
   */
  data?: T | DataManagerResponseErrors;

  /**
   * Response metadata
   */
  metadata?: unknown;

  /**
   * Response status code
   */
  status: number;

  /**
   * Response status text
   */
  statusText: string;

  /**
   * Response headers
   */
  headers: Record<string, string>;

  /**
   * Indicates whether or not the response is the result of a redirect
   */
  redirected: boolean;

  /**
   * The URL of the response
   */
  url: string;

  /**
   * Pagination object
   */
  pagination?: Proteo4Pagination;

  /**
   * Customization object
   */
  customization?: unknown;

  /**
   * Custom messages
   */
  messages?: DataManagerMessage[];
}

export interface DataManagerRequestContainer {
  /**
   * Driver that contains the stored request
   */
  driverName: string;

  /**
   * The contained request
   */
  request: DataManagerRequest;
}

/**
 * Data Manager Request. Parameters for performing a HTTP Request
 */
export interface DataManagerRequest {
  /**
   * Request url (relative or absolute depends on the driver configuration)
   */
  url: string;

  /**
   * HTTP method for the request
   */
  method: HttpMethod;

  /**
   * Request data into body (only for POST, PUT, PATCH requests)
   */
  data?: unknown;

  /**
   * Headers to use in http request
   */
  headers?: Record<string, string>;

  /**
   * URL parameters for the request (only for GET and OPTIONS response)
   */
  queryParams?: Record<string, string>;

  /**
   * Extra params for the request (just for BSM)
   */
  params?: Record<string, string>;

  /**
   * Channel for download file
   */
  channel?: string;

  /**
   * Content type for download file
   */
  contentType?: string;

  /**
   * Processed data for current request on API when request was started
   */
  processedUrl?: string;
  processedBody?: string | FormData;

  /**
   * Data Manager Request Options
   */
  options?: DataManagerRequestOptions;
}

export interface DataManagerExtendedRequest extends DataManagerRequest {
  interceptors?: DriverInterceptor[];
  requestId?: string;
  driverName?: string;
}

export interface SendErrorOptions {
  /**
   * Determines whether a translated error is sent through sendError. Defaults to true
   */
  propagate: boolean;

  /**
   * Array of aliases to exclude from sendError behavior
   */
  excludedAliases?: string[];
}
export interface DataManagerRequestOptions {
  /**
   * Request Redirect param
   */
  redirect?: RequestRedirect;

  /**
   * SendError after error translate options
   */
  sendError?: SendErrorOptions;
}

/**
 * Response errors
 */
export interface DataManagerResponseErrors {
  messages: DataManagerResponseError[];
  [key: string]: unknown;
}

/**
 * Response Error
 */
export interface DataManagerMessage {
  /**
   * Message alias.
   */
  alias: string;

  /**
   * Message description
   */
  message: string;

  /**
   * Message criticism
   */
  type: ErrorSeverity;

  /**
   * Array with associated parameters, shares format with error parameters
   */
  parameters?: ResponseErrorParam[];
}

/**
 * Response Error
 */
export interface DataManagerResponseError {
  /**
   * Error alias. Human Readable
   */
  alias: string;

  /**
   * Error description
   */
  message: string;

  /**
   * Error criticism
   */
  type: ErrorSeverity;

  /**
   * Error title
   */
  title?: string;

  /**
   * Array with associated errors for the request
   */
  params?: ResponseErrorParam[];
}

/**
 * @deprecated sustituir cuando se migren los tipos a DataManager por el exportado desde ErrorManagementUtils
 */
// TODO: Eliminar este tipo tras migrar los tipos de DataManager, ya que pertenecerá a ErrorManager (antiguo ErrorManagementUtils)
export type ErrorSeverity = 'CRITICAL' | 'FATAL' | 'ERROR' | 'WARNING' | 'INFO' | 'ORDINARY';

/**
 * Response Error param
 */
export interface ResponseErrorParam {
  /**
   * Param name produces the error
   */
  name: string;

  /**
   * Error description by the param
   */
  message: string;
}
