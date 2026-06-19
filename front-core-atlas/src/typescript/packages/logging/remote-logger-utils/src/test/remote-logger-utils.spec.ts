/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';
import { LoggerLevel, LoggerUtils } from '@proteo/logger-utils';
import { type CoreAppConfig, type LoggerCustomEvent, MaintenanceCause } from '@proteo/types';
import type { FetchMock } from 'jest-fetch-mock';
import fetch from 'jest-fetch-mock';
import { BUFFER_MAX_SIZE, PENDING_BUFFER_MAX_SIZE } from '../constants.js';
const fetchMock = fetch as unknown as FetchMock;
fetchMock.enableMocks();
jest.useFakeTimers();

const httpMock = jest.fn();
const hasTokensMock = true;
const hasNativeTokensMock: jest.MockedFunction<() => Promise<boolean>> = jest.fn();

const getDriverMock = jest.fn();
getDriverMock.mockReturnValue({
  http: httpMock,
  getHasTokens: hasTokensMock,
  hasNativeTokens: hasNativeTokensMock
});
jest.unstable_mockModule('@proteo/data-manager', () => ({
  getDriver: getDriverMock
}));

const createUUIDMock = jest.fn();
createUUIDMock.mockReturnValue('uuidMock');
jest.unstable_mockModule('@proteo/uuid-utils', () => ({
  createUUID: createUUIDMock
}));

const isNativeMock = jest.fn();
const getChannelMock = jest.fn();
getChannelMock.mockReturnValue('channelMock');
jest.unstable_mockModule('@proteo/platform-utils', () => ({
  isNative: isNativeMock,
  getChannel: getChannelMock
}));

const getUserInfoMock = jest.fn();
jest.unstable_mockModule('@proteo/authorization-utils', () => ({
  AuthUserInfo: { get: getUserInfoMock }
}));

describe('remote-logger-utils', () => {
  let log: any;
  let externalConfigData: CoreAppConfig;

  beforeEach(async () => {
    await import('@proteo/data-manager');
    ({ log } = await import('../remote-logger-utils.js'));
    LoggerUtils.prototype.debug = jest.fn();
    LoggerUtils.prototype.warn = jest.fn();
    LoggerUtils.prototype.error = jest.fn();
    isNativeMock.mockReturnValue(false);
    getUserInfoMock.mockReturnValue({ numpersona: 'customerIdMock' });
    getDriverMock.mockReturnValue({
      http: httpMock,
      getHasTokens: hasTokensMock,
      hasNativeTokens: hasNativeTokensMock
    });
    externalConfigData = {
      APP_EVENTS: [],
      APP_CONFIG: {
        NAME: 'mock_app',
        DEFAULT_LOCALE: 'es',
        VERSION: '0.0.1'
      },
      DATAMANAGER_CONFIG: {
        DEFAULT: {
          BASE_PATH: 'http://localhost:9000',
          HOST: '/mock_host',
          REQUEST_TIMEOUT: 890999,
          DRIVER: 'HTTP'
        },
        BS: {
          HOST: 'http://localhost:9000',
          BASE_PATH: '/bs_mock_host',
          REQUEST_TIMEOUT: 30000,
          DRIVER: 'P4'
        },
        LOGGER_CORE: {
          HOST: 'http://localhost:9000',
          BASE_PATH: '/logger_core_mock_host',
          REQUEST_TIMEOUT: 30000,
          DRIVER: 'P4'
        },
        LOGGER_APP: {
          HOST: 'http://localhost:9000',
          BASE_PATH: '/logger_app_mock_host',
          REQUEST_TIMEOUT: 30000,
          DRIVER: 'P4'
        }
      },
      CONFIG_VERSION: '0.0.1',
      LOGGING_CONFIG: {
        LOG_LEVEL: LoggerLevel.debug,
        API_ENABLED: true,
        API_LOG_LEVEL: LoggerLevel.error,
        API_FW_LOG_LEVEL: LoggerLevel.error,
        DATAMANAGER_CORE: 'LOGGER_CORE',
        DATAMANAGER_APP: 'LOGGER_APP'
      },
      MAINTENANCE_CONFIG: {
        TYPE: 'local',
        ENABLED: false,
        CAUSE: MaintenanceCause.all_services_maintenance,
        URL: ''
      }
    };
  });

  afterEach(() => {
    fetchMock.resetMocks();
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('access log', () => {
    let accessLogEvent: LoggerCustomEvent;
    let headers: any;
    let logModel: any;

    beforeEach(() => {
      headers = {
        'content-type': 'application/json',
        'x-request-id': 'xRequestIdMock'
      };
      accessLogEvent = {
        message: 'REQUEST-SENT',
        meta: [
          {
            remoteLogger: true,
            type: 'access',
            url: 'http://localhost:9000/bs_mock_host/bs_mock_endpoint',
            method: 'GET',
            headers
          }
        ],
        level: 'info'
      };

      logModel = {
        data: [
          {
            code: 'REQUEST-SENT',
            metaType: 'ACCESS_LOG',
            timestamp: expect.any(String),
            app: {
              metaType: 'ACCESS_APP',
              name: 'ms-bff-front-log-MOCK_APP',
              version: '0.0.1',
              type: 'FRONT'
            },
            request: {
              metaType: 'ACCESS_REQUEST',
              host: 'http://localhost:9000',
              path: '/bs_mock_host/bs_mock_endpoint',
              method: 'GET',
              channel: 'CHANNELMOCK',
              xRequestId: 'xRequestIdMock',
              xInstanceId: 'uuidMock',
              userAgent: window.navigator.userAgent
            },
            customer: {
              id: 'customerIdMock'
            }
          }
        ],
        headers: {
          'x-instance-id': 'uuidMock'
        },
        method: 'POST',
        url: '/logs/access'
      };
    });

    it('should log immediately when buffer is full', async () => {
      expect.assertions(1);

      for (let i = 0; i < BUFFER_MAX_SIZE; i++) {
        log(externalConfigData, accessLogEvent);
      }

      await jest.runAllTimersAsync();

      expect(httpMock).toHaveBeenCalledTimes(1);
    });

    it('should call access log function from core in web, base case', async () => {
      expect.assertions(3);

      log(externalConfigData, accessLogEvent).then(() => {
        expect(getDriverMock).toHaveBeenCalledWith('LOGGER_CORE');
        expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith('[Proteo 4] Sending log package');
        expect(httpMock).toHaveBeenCalledWith(logModel);
      });

      await jest.runAllTimersAsync();
    });

    it('should set code to RESPONSE-RECEIVED if not set to REQUEST-SENT', async () => {
      expect.assertions(3);

      accessLogEvent.message = 'accessLogMessageMock';
      logModel.data[0].code = 'RESPONSE-RECEIVED';

      log(externalConfigData, accessLogEvent).then(() => {
        expect(getDriverMock).toHaveBeenCalledWith('LOGGER_CORE');
        expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith('[Proteo 4] Sending log package');
        expect(httpMock).toHaveBeenCalledWith(logModel);
      });

      await jest.runAllTimersAsync();
    });

    it('should set xRequestId to notAvailable if header is missing', async () => {
      expect.assertions(3);

      (accessLogEvent.meta[0] as any).headers['x-request-id'] = undefined;
      logModel.data[0].request.xRequestId = 'notAvailable';

      log(externalConfigData, accessLogEvent).then(() => {
        expect(getDriverMock).toHaveBeenCalledWith('LOGGER_CORE');
        expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith('[Proteo 4] Sending log package');
        expect(httpMock).toHaveBeenCalledWith(logModel);
      });

      await jest.runAllTimersAsync();
    });

    it('should log in native if there are native tokens', async () => {
      expect.assertions(3);
      isNativeMock.mockReturnValueOnce(true);
      hasNativeTokensMock.mockReturnValueOnce(Promise.resolve(true));
      log(externalConfigData, accessLogEvent).then(() => {
        expect(getDriverMock).toHaveBeenCalledWith('LOGGER_CORE');
        expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith('[Proteo 4] Sending log package');
        expect(httpMock).toHaveBeenCalledWith(logModel);
      });
      await jest.runAllTimersAsync();
    });

    it('should not log in native if there are not native tokens', async () => {
      expect.assertions(3);
      isNativeMock.mockReturnValueOnce(true);
      hasNativeTokensMock.mockReturnValueOnce(Promise.resolve(false));
      log(externalConfigData, accessLogEvent).then(() => {
        expect(getDriverMock).toHaveBeenCalledWith('LOGGER_CORE');
        expect(LoggerUtils.prototype.debug).not.toHaveBeenCalled();
        expect(httpMock).not.toHaveBeenCalled();
      });
      await jest.runAllTimersAsync();
    });

    it('should set host and path to empty string if url is missing', async () => {
      expect.assertions(3);

      (accessLogEvent.meta[0] as any).url = '';
      logModel.data[0].request.host = '';
      logModel.data[0].request.path = '';

      log(externalConfigData, accessLogEvent).then(() => {
        expect(getDriverMock).toHaveBeenCalledWith('LOGGER_CORE');
        expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith('[Proteo 4] Sending log package');
        expect(httpMock).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.arrayContaining([logModel.data[0]]),
            headers: logModel.headers,
            method: logModel.method,
            url: logModel.url
          })
        );
      });

      await jest.runAllTimersAsync();
    });

    it('should not log if LOGGING_CONFIG has no DATAMANAGER_CORE entry', async () => {
      expect.assertions(2);

      externalConfigData.LOGGING_CONFIG!.DATAMANAGER_CORE = undefined as any;

      await log(externalConfigData, accessLogEvent);

      expect(getDriverMock).not.toHaveBeenCalled();
      expect(httpMock).not.toHaveBeenCalled();
    });

    it('should not log if no proper driver is found', async () => {
      expect.assertions(2);

      getDriverMock.mockReturnValueOnce(undefined);

      log(externalConfigData, accessLogEvent).then(() => {
        expect(getDriverMock).toHaveBeenCalledWith('LOGGER_CORE');
        expect(httpMock).not.toHaveBeenCalled();
      });

      await jest.runAllTimersAsync();
    });
  });

  describe('application log', () => {
    let loggerEvent: LoggerCustomEvent;
    let logModel: any;

    beforeEach(() => {
      loggerEvent = {
        message: 'Proteo4 Application Loading Log: Loading from mock-app mfe in MOCK_APP portal.',
        meta: [
          {
            remoteLogger: true,
            type: 'application',
            loading: true
          }
        ],
        level: 'info'
      };
      logModel = {
        data: [
          {
            app: {
              className: 'notAvailable',
              layer: 'FRAMEWORK',
              metaType: 'APPLICATION_APP',
              name: 'ms-bff-front-log-MOCK_APP',
              type: 'FRONT',
              version: '0.0.1'
            },
            level: 'INFO',
            message: 'Proteo4 Application Loading Log: Loading from mock-app mfe in MOCK_APP portal.',
            metaType: 'APPLICATION_LOG',
            request: {
              channel: 'CHANNELMOCK',
              metaType: 'APPLICATION_REQUEST',
              userAgent: expect.anything(),
              xInstanceId: 'uuidMock'
            },
            customer: {
              id: 'customerIdMock'
            },
            timestamp: expect.any(String)
          }
        ],
        headers: {
          'x-instance-id': 'uuidMock'
        },
        method: 'POST',
        url: '/logs/application'
      };
    });

    it('should call application log function from core in web, base case', async () => {
      expect.assertions(2);

      log(externalConfigData, loggerEvent).then(() => {
        expect(getDriverMock).toHaveBeenCalledWith('LOGGER_CORE');
        expect(httpMock).toHaveBeenCalledWith(logModel);
      });

      await jest.runAllTimersAsync();
    });

    it('should call application log function from app in web', async () => {
      expect.assertions(2);

      (loggerEvent.meta[0] as any).remoteLogger = false;
      externalConfigData.LOGGING_CONFIG!.API_LOG_LEVEL = LoggerLevel.info;

      logModel.data[0].app.layer = 'APP';
      // When remoteLogger is false, the meta object is not a RemoteLogger config and gets
      // serialized as extraMeta and appended to the message
      logModel.data[0].message =
        'Proteo4 Application Loading Log: Loading from mock-app mfe in MOCK_APP portal. {"remoteLogger":false,"type":"application","loading":true}';

      log(externalConfigData, loggerEvent).then(() => {
        expect(getDriverMock).toHaveBeenCalledWith('LOGGER_APP');
        expect(httpMock).toHaveBeenCalledWith(logModel);
      });

      await jest.runAllTimersAsync();
    });

    it('should return null if level is not adequate for app', async () => {
      expect.assertions(3);

      (loggerEvent.meta[0] as any).remoteLogger = false;

      const response = await log(externalConfigData, loggerEvent);

      expect(response).toBe(null);
      expect(getDriverMock).not.toHaveBeenCalled();
      expect(httpMock).not.toHaveBeenCalled();
    });

    it('should not log if log level is wrongly set', async () => {
      expect.assertions(2);

      loggerEvent.level = 'wrongLevelMock';
      (loggerEvent.meta[0] as any).loading = false;

      await log(externalConfigData, loggerEvent);

      expect(getDriverMock).not.toHaveBeenCalled();
      expect(httpMock).not.toHaveBeenCalled();
    });
  });

  it('should not call any logs if logger type wrongly set', async () => {
    expect.assertions(1);
    const loggerEvent = {
      message: 'Proteo4 Application Loading Log: Loading from mock-app mfe in MOCK_APP portal.',
      meta: [
        {
          remoteLogger: true,
          type: 'wrongTypeMock',
          loading: true
        }
      ],
      level: 'info'
    };
    await log(externalConfigData, loggerEvent);
    expect(httpMock).not.toHaveBeenCalled();
  });

  // it('should call log function with the log type application from core', async () => {
  //   const createLogEvent = (level: LoggerLevel): LoggerCustomEvent => ({
  //     message: `Proteo4 Application ${level} log from core.`,
  //     meta: [
  //       {
  //         remoteLogger: true,
  //         type: 'application'
  //       }
  //     ],
  //     level
  //   });

  //   Promise.allSettled([
  //     log(ExternalConfigData, createLogEvent(LoggerLevel.debug)),
  //     log(ExternalConfigData, createLogEvent(LoggerLevel.warn)),
  //     log(ExternalConfigData, createLogEvent(LoggerLevel.error))
  //   ]).then(() => {
  //     expect(httpMock).toBeCalledTimes(0);
  //     /*
  //     expect(httpMock).toBeCalledWith(
  //       expect.objectContaining({
  //         data: [
  //           expect.objectContaining({
  //             app: expect.objectContaining({
  //               layer: 'FRAMEWORK'
  //             }),
  //             message: 'Proteo4 Application error log from core.',
  //             metaType: 'APPLICATION_LOG'
  //           })
  //         ],
  //         method: 'POST',
  //         url: '/logs/application'
  //       })
  //     );
  //     */
  //   });
  //   jest.runAllTimers();
  // });

  // it('should call log function with the log type application from app', async () => {
  //   const createLogEvent = (level: LoggerLevel): Partial<LoggerCustomEvent> => ({
  //     message: `Proteo4 Application ${level} log from app.`,
  //     level
  //   });

  //   Promise.all([
  //     log(ExternalConfigData, createLogEvent(LoggerLevel.debug)),
  //     log(ExternalConfigData, createLogEvent(LoggerLevel.warn)),
  //     log(ExternalConfigData, createLogEvent(LoggerLevel.error))
  //   ]).finally(() => {
  //     expect(httpMock).toBeCalledTimes(0);
  //     /*
  //     expect(httpMock).toBeCalledWith(
  //       expect.objectContaining({
  //         data: [
  //           expect.objectContaining({
  //             app: expect.objectContaining({
  //               layer: 'APP'
  //             }),
  //             message: 'Proteo4 Application error log from app.',
  //             metaType: 'APPLICATION_LOG'
  //           })
  //         ],
  //         method: 'POST',
  //         url: '/logs/application'
  //       })
  //     );
  //     */
  //   });

  //   jest.runAllTimers();
  // });

  // it('should call log function with the log type access from core', async () => {
  //   const headers = {
  //     'content-type': 'application/json',
  //     'x-request-id': '330533b0-ca11-455c-b5c2-0067660e2dfe'
  //   };
  //   const accessLogEvent: LoggerCustomEvent = {
  //     message: 'REQUEST-SENT',
  //     meta: [
  //       {
  //         remoteLogger: true,
  //         type: 'access',
  //         url: 'http://localhost:9000/bs_mock_host/bs_mock_endpoint',
  //         method: 'GET',
  //         headers
  //       }
  //     ],
  //     level: 'info'
  //   };

  //   log(ExternalConfigData, accessLogEvent).then(() => {
  //     expect(httpMock).toBeCalledTimes(0);
  //   });

  //   jest.runAllTimers();
  // });

  // it('should call log function with an un-existing type of log with property remoteLogger should not call http', async () => {
  //   const loggerEvent: LoggerCustomEvent = {
  //     message: 'Log message',
  //     meta: [
  //       {
  //         remoteLogger: true,
  //         type: 'my_type'
  //       }
  //     ],
  //     level: 'error'
  //   };

  //   log(ExternalConfigData, loggerEvent)?.then(() => {
  //     expect(httpMock).toBeCalledTimes(0);
  //   });
  // });

  // it('should call log function without tokens set in the app', async () => {

  //   const loggerEvent: LoggerCustomEvent = {
  //     message: 'Proteo4 Application error log from core.',
  //     meta: [
  //       {
  //         remoteLogger: true,
  //         type: 'application'
  //       }
  //     ],
  //     level: 'error'
  //   };

  //   log(ExternalConfigData, loggerEvent).then(() => expect(httpMock).toBeCalledTimes(0));
  // });

  // it('should call log function for native with tokens', async () => {
  //   nativeValue = true;
  //   hasNativeTokensMock.mockResolvedValueOnce(true);
  //   const loggerEvent: LoggerCustomEvent = {
  //     message: 'Proteo4 Application Loading Log: Loading from mock-app mfe in MOCK_APP portal.',
  //     meta: [
  //       {
  //         remoteLogger: true,
  //         type: 'application',
  //         loading: true
  //       }
  //     ],
  //     level: 'info'
  //   };
  //   log(ExternalConfigData, loggerEvent).then(() => {
  //     expect(httpMock).toHaveBeenCalled();
  //   });
  // });

  // it('should not call log function for native without tokens', async () => {
  //   nativeValue = true;
  //   hasNativeTokensMock.mockResolvedValueOnce(false);
  //   const loggerEvent: LoggerCustomEvent = {
  //     message: 'Proteo4 Application Loading Log: Loading from mock-app mfe in MOCK_APP portal.',
  //     meta: [
  //       {
  //         remoteLogger: true,
  //         type: 'application',
  //         loading: true
  //       }
  //     ],
  //     level: 'info'
  //   };
  //   log(ExternalConfigData, loggerEvent).then(() => {
  //     expect(httpMock).not.toHaveBeenCalled();
  //   });
  // });

  // it('should not call log function for native with failed token request', async () => {
  //   nativeValue = true;
  //   // hasNativeTokensMock.mockRejectedValueOnce(false);
  //   const loggerEvent: LoggerCustomEvent = {
  //     message: 'Proteo4 Application Loading Log: Loading from mock-app mfe in MOCK_APP portal.',
  //     meta: [
  //       {
  //         remoteLogger: true,
  //         type: 'application',
  //         loading: true
  //       }
  //     ],
  //     level: 'info'
  //   };
  //   log(ExternalConfigData, loggerEvent).then(() => {
  //     expect(httpMock).not.toHaveBeenCalled();
  //   });
  // });

  describe('enriched message from extra meta', () => {
    let baseEvent: LoggerCustomEvent;

    beforeEach(() => {
      baseEvent = {
        message: 'base message',
        meta: [
          {
            remoteLogger: true,
            type: 'application',
            loading: true
          }
        ],
        level: 'info'
      };
    });

    it('should append extra string meta to the message', async () => {
      expect.assertions(1);

      (baseEvent.meta as any[]).push('extra-string');

      log(externalConfigData, baseEvent).then(() => {
        expect(httpMock).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.arrayContaining([expect.objectContaining({ message: 'base message extra-string' })])
          })
        );
      });

      await jest.runAllTimersAsync();
    });

    it('should append serialized object meta to the message', async () => {
      expect.assertions(1);

      (baseEvent.meta as any[]).push({ someKey: 'someValue' });

      log(externalConfigData, baseEvent).then(() => {
        expect(httpMock).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.arrayContaining([expect.objectContaining({ message: 'base message {"someKey":"someValue"}' })])
          })
        );
      });

      await jest.runAllTimersAsync();
    });

    it('should not alter message when no extra meta is present', async () => {
      expect.assertions(1);

      log(externalConfigData, baseEvent).then(() => {
        expect(httpMock).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.arrayContaining([expect.objectContaining({ message: 'base message' })])
          })
        );
      });

      await jest.runAllTimersAsync();
    });

    it('should handle multiple extra meta items joined by space', async () => {
      expect.assertions(1);

      (baseEvent.meta as any[]).push('str1', { k: 'v' });

      log(externalConfigData, baseEvent).then(() => {
        expect(httpMock).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.arrayContaining([expect.objectContaining({ message: 'base message str1 {"k":"v"}' })])
          })
        );
      });

      await jest.runAllTimersAsync();
    });
  });

  describe('customer id in log models', () => {
    it('should use NO_ID_PROVIDED in access log when getUserInfo returns null', async () => {
      expect.assertions(1);

      getUserInfoMock.mockReturnValueOnce(null);

      const accessEvent: LoggerCustomEvent = {
        message: 'REQUEST-SENT',
        meta: [
          {
            remoteLogger: true,
            type: 'access',
            url: 'http://localhost:9000/bs_mock_host/bs_mock_endpoint',
            method: 'GET',
            headers: { 'content-type': 'application/json', 'x-request-id': 'xRequestIdMock' }
          }
        ],
        level: 'info'
      };

      log(externalConfigData, accessEvent).then(() => {
        expect(httpMock).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.arrayContaining([expect.objectContaining({ customer: { id: 'No ID provided' } })])
          })
        );
      });

      await jest.runAllTimersAsync();
    });

    it('should use NO_ID_PROVIDED in application log when getUserInfo returns null', async () => {
      expect.assertions(1);

      getUserInfoMock.mockReturnValueOnce(null);

      const appEvent: LoggerCustomEvent = {
        message: 'Proteo4 Application Loading Log: Loading from mock-app mfe in MOCK_APP portal.',
        meta: [{ remoteLogger: true, type: 'application', loading: true }],
        level: 'info'
      };

      log(externalConfigData, appEvent).then(() => {
        expect(httpMock).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.arrayContaining([expect.objectContaining({ customer: { id: 'No ID provided' } })])
          })
        );
      });

      await jest.runAllTimersAsync();
    });
  });

  describe('pendingBuffer behavior', () => {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    let log: any;
    let appEvent: LoggerCustomEvent;

    beforeEach(async () => {
      jest.resetModules();

      jest.unstable_mockModule('@proteo/data-manager', () => ({ getDriver: getDriverMock }));
      jest.unstable_mockModule('@proteo/platform-utils', () => ({
        isNative: isNativeMock,
        getChannel: getChannelMock
      }));
      jest.unstable_mockModule('@proteo/authorization-utils', () => ({ AuthUserInfo: { get: getUserInfoMock } }));
      jest.unstable_mockModule('@proteo/uuid-utils', () => ({ createUUID: createUUIDMock }));

      ({ log } = await import('../remote-logger-utils.js'));

      appEvent = {
        message: 'Proteo4 Application Loading Log: Loading from mock-app mfe in MOCK_APP portal.',
        meta: [{ remoteLogger: true, type: 'application', loading: true }],
        level: 'info'
      };
      httpMock.mockClear();
      getDriverMock.mockClear();
    });

    it('should store logs in pendingBuffer when no driver is available and send on next flush', async () => {
      expect.assertions(2);

      // First flush: no driver → logs go to pending
      getDriverMock.mockReturnValueOnce(undefined);
      log(externalConfigData, appEvent);
      await jest.runAllTimersAsync();
      expect(httpMock).not.toHaveBeenCalled();

      // Second flush: driver available → logs restored and sent
      log(externalConfigData, appEvent);
      await jest.runAllTimersAsync();
      expect(httpMock).toHaveBeenCalledTimes(1);
    });

    it('should store logs in pendingBuffer when web driver has no getHasTokens and send on next flush', async () => {
      expect.assertions(2);

      // First flush: driver without getHasTokens → logs go to pending
      getDriverMock.mockReturnValueOnce({
        http: httpMock,
        hasNativeTokens: hasNativeTokensMock
        // getHasTokens intentionally omitted
      });
      log(externalConfigData, appEvent);
      await jest.runAllTimersAsync();
      expect(httpMock).not.toHaveBeenCalled();

      // Second flush: normal driver → logs restored and sent
      log(externalConfigData, appEvent);
      await jest.runAllTimersAsync();
      expect(httpMock).toHaveBeenCalledTimes(1);
    });

    it('should restore pending logs in chronological order before sending (web)', async () => {
      expect.assertions(1);

      const eventA: LoggerCustomEvent = {
        message: 'log A',
        meta: [{ remoteLogger: true, type: 'application', loading: true }],
        level: 'info'
      };
      const eventB: LoggerCustomEvent = {
        message: 'log B',
        meta: [{ remoteLogger: true, type: 'application', loading: true }],
        level: 'info'
      };

      // Log A goes to pending (no driver)
      getDriverMock.mockReturnValueOnce(undefined);
      log(externalConfigData, eventA);
      await jest.runAllTimersAsync();

      // Log B triggers flush with valid driver → A then B sent in order
      log(externalConfigData, eventB);
      await jest.runAllTimersAsync();

      const callData = httpMock.mock.calls[0][0].data;
      expect(callData.map((d: any) => d.message)).toEqual(['log A', 'log B']);
    });

    it('should store snapshot in pendingBuffer when native hasNativeTokens returns false', async () => {
      expect.assertions(2);

      isNativeMock.mockReturnValue(true);
      hasNativeTokensMock.mockResolvedValueOnce(false);

      log(externalConfigData, appEvent);
      await jest.runAllTimersAsync();
      expect(httpMock).not.toHaveBeenCalled();

      // Next flush with tokens → pending logs sent
      hasNativeTokensMock.mockResolvedValueOnce(true);
      log(externalConfigData, appEvent);
      await jest.runAllTimersAsync();
      expect(httpMock).toHaveBeenCalledTimes(1);
    });

    it('should restore pending logs and send on next flush when native hasNativeTokens returns true', async () => {
      expect.assertions(2);

      isNativeMock.mockReturnValue(true);

      const eventA: LoggerCustomEvent = {
        message: 'native log A',
        meta: [{ remoteLogger: true, type: 'application', loading: true }],
        level: 'info'
      };
      const eventB: LoggerCustomEvent = {
        message: 'native log B',
        meta: [{ remoteLogger: true, type: 'application', loading: true }],
        level: 'info'
      };

      // A goes to pending (no tokens)
      hasNativeTokensMock.mockResolvedValueOnce(false);
      log(externalConfigData, eventA);
      await jest.runAllTimersAsync();
      expect(httpMock).not.toHaveBeenCalled();

      // B triggers flush with tokens: restorePendingLogs puts A back into the buffer,
      // but httpLog only sends the current snapshot (B). A is now in the buffer.
      // A third flush sends A.
      hasNativeTokensMock.mockResolvedValueOnce(true);
      log(externalConfigData, eventB);
      await jest.runAllTimersAsync();

      // After flush of B + restore of A into buffer, a final flush sends A
      hasNativeTokensMock.mockResolvedValueOnce(true);
      log(externalConfigData, {
        message: 'trigger',
        meta: [{ remoteLogger: true, type: 'application', loading: true }],
        level: 'info'
      });
      await jest.runAllTimersAsync();

      // All logs across both calls to httpMock
      const allMessages = httpMock.mock.calls.flatMap((call: any) => call[0].data.map((d: any) => d.message));
      expect(allMessages).toContain('native log A');
    });

    it('should enforce FIFO eviction when pendingBuffer exceeds PENDING_BUFFER_MAX_SIZE', async () => {
      expect.assertions(2);

      // Use a single driver-unavailable flush to send PENDING_BUFFER_MAX_SIZE + 5 logs to pending.
      // The debounce coalesces all calls into one flush, so only one getDriverMock call is made.
      getDriverMock.mockReturnValueOnce(undefined);
      for (let i = 0; i < PENDING_BUFFER_MAX_SIZE + 5; i++) {
        log(externalConfigData, {
          message: `log ${i}`,
          meta: [{ remoteLogger: true, type: 'application', loading: true }],
          level: 'info'
        });
      }
      await jest.runAllTimersAsync();
      expect(httpMock).not.toHaveBeenCalled();

      // Next flush: restored logs should be capped at PENDING_BUFFER_MAX_SIZE
      log(externalConfigData, appEvent);
      await jest.runAllTimersAsync();

      const callData = httpMock.mock.calls[0][0].data;
      // +1 for appEvent itself (current flush)
      expect(callData.length).toBeLessThanOrEqual(PENDING_BUFFER_MAX_SIZE + 1);
    });

    it('should not duplicate logs when pendingBuffer is empty (no pending restore)', async () => {
      expect.assertions(1);

      log(externalConfigData, appEvent);
      await jest.runAllTimersAsync();

      // Only the single log from appEvent should be sent, no duplicates from pending
      const callData = httpMock.mock.calls[0][0].data;
      expect(callData.length).toBe(1);
    });

    it('should pass buffer snapshot to httpLog to avoid race conditions in native', async () => {
      expect.assertions(1);

      isNativeMock.mockReturnValue(true);

      let resolveTokens!: (v: boolean) => void;
      const tokenPromise = new Promise<boolean>((res) => {
        resolveTokens = res;
      });
      hasNativeTokensMock.mockReturnValueOnce(tokenPromise);

      // First log triggers native flush (token check in flight)
      log(externalConfigData, {
        message: 'early log',
        meta: [{ remoteLogger: true, type: 'application', loading: true }],
        level: 'info'
      });
      await jest.runAllTimersAsync();

      // Late log added while token check is in flight (should NOT appear in first httpMock call)
      hasNativeTokensMock.mockResolvedValueOnce(true);
      log(externalConfigData, {
        message: 'late log',
        meta: [{ remoteLogger: true, type: 'application', loading: true }],
        level: 'info'
      });

      // Resolve first token check
      resolveTokens(true);
      await jest.runAllTimersAsync();

      // First call to httpMock should only contain 'early log'
      const firstCallData = httpMock.mock.calls[0][0].data;
      expect(firstCallData.map((d: any) => d.message)).toEqual(['early log']);
    });
  });
});
