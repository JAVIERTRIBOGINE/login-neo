/**
 * Different types of buffer
 */
export type BufferType = 'ACCESS' | 'CORE' | 'APP';

/**
 * Different types of driver
 */
export type DataManagerType = 'CORE' | 'APP';

export type RemoteLogger = {
  remoteLogger: boolean;
  type: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  response?: unknown;
  loading?: boolean;
};

export type LoggerCustomEvent = {
  message: unknown;
  meta: (RemoteLogger | unknown)[];
  level: string;
};
