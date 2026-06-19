import type { DataManagerDriver } from '@proteo/data-manager-driver';

/**
 * Different types of buffer
 */
export type BufferType = 'ACCESS' | 'CORE' | 'APP';

/**
 * Different types of driver
 */
export type DriverType = 'CORE' | 'APP';

export type DriverMap = Record<DriverType, DataManagerDriver>;

/**
 * Object for the Access Logs
 */
export interface AccessLogEntry {
  body: AccessLogType;
}
export interface AccessLogType {
  /**
   * Fixed value for Elastic
   */
  metaType: 'ACCESS_LOG';
  /**
   * Timestamp of the moment when the log is generated
   */
  timestamp: string;
  /**
   * Code of the access log
   * REQUEST-SENT when the log is emitted when sending the request
   * RESPONSE-RECEIVED then the log is emitted when receiving the response
   */
  code: 'REQUEST-SENT' | 'RESPONSE-RECEIVED';
  /**
   * app object for the log
   */
  app: AccessLogAppType;
  /**
   * context object for the log
   */
  context?: ProjectContext;
  /**
   * request object for the log
   */
  request: AccessLogRequestType;
  /**
   * response object for the log
   */
  response?: AccessLogResponseType;
  /**
   * customer numper
   */
  customer: {
    id: string;
  };
}
interface AccessLogAppType {
  /**
   * Fixed value for Elastic
   */
  metaType: 'ACCESS_APP';
  /**
   * Apps name
   */
  name: string;
  /**
   * Apps version
   */
  version: string;
  /**
   * Needed for the log
   * It can be FRONT or MS (microservice)
   */
  type: 'FRONT';
  /**
   * framework object for the app
   */
  framework?: FrameworkSettings;
}
interface AccessLogRequestType {
  /**
   * Fixed value for Elastic
   */
  metaType: 'ACCESS_REQUEST';
  /**
   * Host where the request was sent
   */
  host: string;
  /**
   * Rest of the path for the request
   */
  path: string;
  /**
   * Method used (GET, PUT, POST, ...)
   */
  method: string;
  /**
   * Where is the app being executed (BSO, BSM, EE, FULL-PROTEO)
   */
  channel: string;
  /**
   * X-Request-Id of the request for this log
   */
  xRequestId: string;
  /**
   * X-Instance-ID Unique User Identifier for all the instance
   */
  xInstanceId: string;
  /**
   * The user agent captured when the log was emitted
   */
  userAgent: string;
  /**
   * If available (bs)
   */
  brand?: string;
  /**
   * If available
   * ClientID of the app
   */
  clientId?: string;
  /**
   * customer numper
   */
  customer: {
    id: string;
  };
}
interface AccessLogResponseType {
  /**
   * Time elapsed since the REQUEST-SENT was emitted until the RESPONSE-RECEIVED is detected
   */
  duration?: string;
  /**
   * Status code for the response
   */
  statusCode?: string;
}

/**
 * Object for the Application Logs
 */
export interface AppLogEntry {
  body: AppLogType;
}
export interface AppLogType {
  /**
   * Fixed value for Elastic
   */
  metaType: string;
  /**
   * Timestamp of the moment when the log is generated
   */
  timestamp: string;
  /**
   * Level of the log
   */
  level: string;
  /**
   * Message from the log
   */
  message: string;
  /**
   * app object for the log
   */
  app: AppLogAppType;
  /**
   * request object for the log
   */
  request: AppLogRequestType;
  /**
   * customer numper
   */
  customer: {
    id: string;
  };
}
interface AppLogAppType {
  /**
   * Fixed value for Elastic
   */
  metaType: string;
  /**
   * Applications name
   */
  name: string;
  /**
   * Applications version
   */
  version: string;
  /**
   * Fixed value for Kibana
   */
  type: 'FRONT';
  /**
   * angulars class
   */
  className: string;
  /**
   * Where the log has been detected
   */
  layer: 'FRAMEWORK' | 'APP';
  /**
   * framework object
   */
  framework?: FrameworkSettings;
}
interface AppLogRequestType {
  /**
   * Fixed value for Elastic
   */
  metaType: string;
  /**
   * channel where the log was generated
   */
  channel: string;
  /**
   * X-Instance-ID Unique User Identifier for all the instance
   */
  xInstanceId: string;
  /**
   * User agent when the log was generated
   */
  userAgent: string;
  /**
   * brand
   */
  brand?: string;
  /**
   * apps client id
   */
  clientId?: string;
}
interface FrameworkSettings {
  version: string;
}

interface ProjectContext {
  project: string;
}

/**
 * Interface for the buffer Object of the logs
 */
export interface BufferObject {
  buffer: (AccessLogType | AppLogType)[];
  driver?: DataManagerDriver;
  url?: string;
}
