import { getDriver } from '@proteo/data-manager';
import { LoggerLevelConfig, LoggerUtils } from '@proteo/logger-utils';
import { getChannel, isNative } from '@proteo/platform-utils';
import { StorageManager } from '@proteo/storage-utils';
import { normalizeId } from '@proteo/string-utils';
import type { BaseAppConfig, BufferType, DataManagerType, LoggerCustomEvent, RemoteLogger } from '@proteo/types';
import { createUUID } from '@proteo/uuid-utils';
import { BUFFER_MAX_SIZE, DEBOUNCE_TIMER, PENDING_BUFFER_MAX_SIZE, NO_ID_PROVIDED } from './constants.js';
import type { AccessLogType, AppLogType } from './types/index.js';
import { AuthUserInfo } from '@proteo/authorization-utils';

/**
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing.
 */
function debounce<R = void>(
  fn: (...args: [{ bufferType: BufferType; dataManagerType: DataManagerType; url?: string }]) => R,
  ms: number
): (...args: [{ bufferType: BufferType; dataManagerType: DataManagerType; url?: string }]) => Promise<R> {
  let timer: NodeJS.Timeout;
  return (...args: [{ bufferType: BufferType; dataManagerType: DataManagerType; url?: string }]): Promise<R> => {
    if (timer) clearTimeout(timer);
    if (checkBufferSize(...[args[0].bufferType]) >= BUFFER_MAX_SIZE) {
      ms = 0;
    }
    return new Promise((resolve) => {
      timer = setTimeout(() => {
        resolve(fn(...args));
      }, ms);
    });
  };
}

/**
 * Buffer for developer´s logs
 */
const developerBuffer: AppLogType[] = [];

/**
 * Buffer for core application logs
 */
const coreAppBuffer: AppLogType[] = [];

/**
 * Buffer for access logs
 */
const coreAccessBuffer: AccessLogType[] = [];

/**
 * Object for checking the different buffers and their objects
 */
const logBuffers: Record<BufferType, { url: string; buffer: AppLogType[] | AccessLogType[] | [] }> = {
  ACCESS: { url: '/logs/access', buffer: coreAccessBuffer },
  CORE: { url: '/logs/application', buffer: coreAppBuffer },
  APP: { url: '/logs/application', buffer: developerBuffer }
};

/**
 * Global pending buffer for logs that could not be sent due to missing authentication.
 * Logs are stored here and restored to their original buffer on the next flush attempt
 * when authentication is available. Max size is PENDING_BUFFER_MAX_SIZE per buffer type (FIFO).
 */
const pendingBuffer: Record<BufferType, (AppLogType | AccessLogType)[]> = {
  ACCESS: [],
  CORE: [],
  APP: []
};

/**
 * Unique User Identifier generated for the session
 * Used to relate de user interaction with the x-request-id and for traceability
 */
const UUID: string = StorageManager.getInstance().get('UUID') || createUUID();
StorageManager.getInstance().set('UUID', UUID);

/**
 * Function used to accumulate access logs into their buffer
 * @returns The debounce function
 */
const flushAccessBufferDebounced = debounce(flushBuffer, DEBOUNCE_TIMER);

/**
 * Function used to accumulate automatic framework application logs into their buffer
 * @returns The debounce function
 */
const flushApplicationBufferDebounced = debounce(flushBuffer, DEBOUNCE_TIMER);

/**
 * Function used to accumulate developer logs into their buffer
 * @returns The debounce function
 */
const flushDeveloperBufferDebounced = debounce(flushBuffer, DEBOUNCE_TIMER);

/**
 * Exposed function to send a log
 * @param type Log type (access or application)
 * @param appConfig App's runtime configuration
 * @param event Event captured coming from the Proteo Logger Util
 */
export function log(appConfig: BaseAppConfig, event: LoggerCustomEvent): Promise<void> | null {
  const date = Date.now().toString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const remoteConfig = event.meta?.find((meta) => {
    return (meta as RemoteLogger)?.remoteLogger === true;
  }) as RemoteLogger;

  const extraMeta =
    event.meta
      ?.filter((meta) => !(meta as RemoteLogger)?.remoteLogger)
      .map((metaElement) => {
        try {
          return typeof metaElement === 'object' ? JSON.stringify(metaElement) : String(metaElement);
        } catch {
          return String(metaElement);
        }
      })
      .join(' ') ?? '';

  const enrichedMessage = extraMeta ? `${event.message as string} ${extraMeta}` : (event.message as string);

  const type = remoteConfig?.type ? remoteConfig.type : 'application';

  switch (type) {
    case 'access':
      return sendAccessLog(date, appConfig, remoteConfig, enrichedMessage);
    case 'application':
      return sendApplicationLog(date, appConfig, remoteConfig, enrichedMessage, event.level);
    default:
      return null;
  }
}

/**
 * Function for accumulating access logs in its buffer
 * @param date Timestamp with the moment the log initiated
 * @param appConfig App's config
 * @param event Event captured coming from the Proteo Logger Util
 */
function sendAccessLog(
  date: string,
  appConfig: BaseAppConfig,
  remoteConfig: RemoteLogger,
  message: string
): Promise<void> | null {
  const code = message.includes('REQUEST-SENT') ? 'REQUEST-SENT' : 'RESPONSE-RECEIVED';
  const url = remoteConfig.url ? new URL(remoteConfig.url) : '';
  const body: AccessLogType = {
    metaType: 'ACCESS_LOG',
    timestamp: date,
    code,
    app: {
      metaType: 'ACCESS_APP',
      name: 'ms-bff-front-log-' + normalizeId(appConfig.APP_CONFIG.NAME),
      version: appConfig.APP_CONFIG.VERSION,
      type: 'FRONT'
    },
    request: {
      metaType: 'ACCESS_REQUEST',
      host: (url as URL).origin ? (url as URL).origin : '',
      path: (url as URL).pathname ? (url as URL).pathname : '',
      method: remoteConfig.method,
      channel: normalizeId(getChannel()),
      xRequestId: remoteConfig.headers['x-request-id'] || 'notAvailable',
      xInstanceId: UUID,
      userAgent: window.navigator.userAgent,
      customer: {
        id: AuthUserInfo.get()?.numpersona ?? NO_ID_PROVIDED
      }
    },
    customer: {
      id: AuthUserInfo.get()?.numpersona ?? NO_ID_PROVIDED
    }
  };
  coreAccessBuffer.push(body);
  if (appConfig.LOGGING_CONFIG?.DATAMANAGER_CORE) {
    return flushAccessBufferDebounced({
      bufferType: 'ACCESS',
      dataManagerType: getDriverType(appConfig, 'CORE'),
      url: logBuffers.ACCESS.url
    });
  }
  return null;
}

/**
 * Function for accumulating access logs in its buffer
 * @param date Timestamp with the moment the log initiated
 * @param appConfig App's config
 * @param event Event captured coming from the Proteo Logger Util
 */
function sendApplicationLog(
  date: string,
  appConfig: BaseAppConfig,
  remoteConfig: RemoteLogger | unknown,
  message: string,
  level: string
): Promise<void> | null {
  const body: AppLogType = {
    metaType: 'APPLICATION_LOG',
    timestamp: date,
    message,
    level: level.toUpperCase(),
    app: {
      metaType: 'APPLICATION_APP',
      name: 'ms-bff-front-log-' + normalizeId(appConfig.APP_CONFIG.NAME),
      version: appConfig.APP_CONFIG.VERSION,
      type: 'FRONT',
      className: 'notAvailable',
      layer: remoteConfig && (remoteConfig as RemoteLogger).remoteLogger ? 'FRAMEWORK' : 'APP'
    },
    request: {
      metaType: 'APPLICATION_REQUEST',
      channel: normalizeId(getChannel()),
      xInstanceId: UUID,
      userAgent: window.navigator.userAgent
    },
    customer: {
      id: AuthUserInfo.get()?.numpersona ?? NO_ID_PROVIDED
    }
  };

  if ((remoteConfig as RemoteLogger)?.remoteLogger) {
    if (
      (level === 'error' || (remoteConfig as RemoteLogger).loading || checkLevelToLog(appConfig, level, 'CORE')) &&
      appConfig.LOGGING_CONFIG?.DATAMANAGER_CORE
    ) {
      coreAppBuffer.push(body);
      return flushApplicationBufferDebounced({
        bufferType: 'CORE',
        dataManagerType: getDriverType(appConfig, 'CORE'),
        url: logBuffers.CORE.url
      });
    }
  } else if (checkLevelToLog(appConfig, level, 'APP') && appConfig.LOGGING_CONFIG?.DATAMANAGER_APP) {
    developerBuffer.push(body);
    return flushDeveloperBufferDebounced({
      bufferType: 'APP',
      dataManagerType: getDriverType(appConfig, 'APP'),
      url: logBuffers.APP.url
    });
  }
  return null;
}

/**
 * Adds logs to the pending buffer for a given buffer type.
 * Enforces a maximum size of PENDING_BUFFER_MAX_SIZE using FIFO eviction.
 * @param bufferType Target buffer type
 * @param logs Logs to store
 */
function addToPendingBuffer(bufferType: BufferType, logs: (AppLogType | AccessLogType)[]): void {
  const pending = pendingBuffer[bufferType];
  for (const log of logs) {
    if (pending.length >= PENDING_BUFFER_MAX_SIZE) {
      pending.shift();
    }
    pending.push(log);
  }
}

/**
 * Restores all pending logs for a given buffer type back to the front of the
 * original buffer, preserving chronological order, and clears the pending store.
 * @param bufferType Target buffer type
 */
function restorePendingLogs(bufferType: BufferType): void {
  const pending = pendingBuffer[bufferType];
  if (pending.length === 0) return;
  const { buffer } = logBuffers[bufferType];
  (buffer as (AppLogType | AccessLogType)[]).unshift(...pending);
  pending.length = 0;
}

/**
 * Sends the object of all logs to the API
 * @param bufferObj contains the bufferType and the url in case of beign a developer log
 */
function flushBuffer(bufferObj: { bufferType: BufferType; dataManagerType: DataManagerType; url?: string }): void {
  function httpLog(data: AppLogType[] | AccessLogType[]) {
    const headers = {
      'x-instance-id': UUID
    };

    // Data manager request to send the full block
    if (driver) {
      LoggerUtils.getInstance().debug('[Proteo 4] Sending log package');
      driver.http({ url, method: 'POST', data, headers });
    }
  }
  const { buffer, url } = logBuffers[bufferObj.bufferType];
  const driver = getDriver(bufferObj.dataManagerType);
  const native = isNative();
  // Here we should check for tokens and if there are not, stop executing the function
  if (!driver || (!native && !driver.getHasTokens)) {
    addToPendingBuffer(bufferObj.bufferType, buffer.splice(0));
    return;
  }
  if (native) {
    // Extract snapshot before async call to avoid race conditions with incoming logs
    const snapshot = buffer.splice(0) as AppLogType[] | AccessLogType[];

    driver.hasNativeTokens().then((response) => {
      if (response) {
        // Restore pending logs only when tokens are confirmed, avoiding unnecessary O(n) work
        restorePendingLogs(bufferObj.bufferType);
        httpLog(snapshot);
      } else {
        // No native tokens: store snapshot in pendingBuffer (FIFO, max 150)
        addToPendingBuffer(bufferObj.bufferType, snapshot);
      }
    });
  } else {
    // Web: tokens already confirmed above, safe to restore pending logs
    restorePendingLogs(bufferObj.bufferType);
    httpLog(buffer.splice(0) as AppLogType[] | AccessLogType[]);
  }
}

/**
 * Function for detecting if the log must be sent to API
 * @param appConfig app configuration
 * @param levelFromLog level from incomming log
 * @param bufferType string indicating what buffer corresponds to go
 * @returns boolean indicating if the log must be sent or not
 */
function checkLevelToLog(appConfig: BaseAppConfig, levelFromLog: string, bufferType: BufferType): boolean {
  // @ts-expect-error should exist LOGGING_CONFIG
  const { API_ENABLED, API_FW_LOG_LEVEL, API_LOG_LEVEL } = appConfig.LOGGING_CONFIG;
  const enabled = API_ENABLED;
  const levelConfigured = bufferType === 'CORE' ? API_FW_LOG_LEVEL : API_LOG_LEVEL;
  const levels = Object.values(LoggerLevelConfig);
  const numericLevelFromLog = levels.find((level) => level.name === levelFromLog?.toUpperCase());
  if (!numericLevelFromLog) {
    return false;
  }
  let configMinLevel = 100;
  let shouldBeLogged = false;

  Object.keys(LoggerLevelConfig).forEach((val, index) => {
    levels[index].num = val;
    if (levels[index].name.toUpperCase() === levelConfigured?.toUpperCase()) {
      configMinLevel = parseInt(val);
    }
  });

  shouldBeLogged = !!numericLevelFromLog.num && configMinLevel <= parseInt(numericLevelFromLog.num);
  return enabled && shouldBeLogged;
}

/**
 * Checks the buffer size
 * @param bufferType string indicating what buffer corresponds to go
 * @returns length of the buffer
 */
function checkBufferSize(bufferType: BufferType): number {
  return logBuffers[bufferType].buffer.length;
}

/**
 * Function to configure the dataManagerType as needed for the log package
 * @param appConfig Application runtime configuration
 * @param dataManagerType Type of dataManagerType needed
 * @returns The dataManagerType already configured
 */
function getDriverType(appConfig: BaseAppConfig, dataManagerType: DataManagerType): DataManagerType {
  // LOGGING_CONFIG is expected to be defined when this function is called
  return (
    dataManagerType === 'CORE' ? appConfig.LOGGING_CONFIG!.DATAMANAGER_CORE : appConfig.LOGGING_CONFIG!.DATAMANAGER_APP
  ) as DataManagerType;
}
