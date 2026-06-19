import { expect, it, jest } from '@jest/globals';
import { getEnvironment } from '@proteo/environment-detection-utils';
import { EnumEnvironments } from '@proteo/types';
import { LoggerUtils } from '@proteo/logger-utils';
import type { MockInstance } from 'jest-mock';
import { appendElementScript } from '@proteo/script-initialization-util';
import { TagManager } from '@proteo/tag-manager';

// Array para almacenar los listeners
const listeners: Array<{ type: string; listener: EventListener }> = [];

// Proxy para window.addEventListener
const originalAddEventListener = window.addEventListener;
(window.addEventListener as any) = function (type: string, listener: EventListener, options?: boolean | AddEventListenerOptions) {
  listeners.push({ type, listener });
  originalAddEventListener.call(window, type, listener, options);
};

// Proxy para window.removeEventListener
const originalRemoveEventListener = window.removeEventListener;
(window.removeEventListener as any) = function (type: string, listener: EventListener, options?: boolean | EventListenerOptions) {
  const index = listeners.findIndex((l) => l.type === type && l.listener === listener);
  if (index !== -1) {
    listeners.splice(index, 1);
  }
  originalRemoveEventListener.call(window, type, listener, options);
};

// Función para eliminar todos los listeners
function removeAllWindowEventListeners() {
  listeners.forEach(({ type, listener }) => {
    originalRemoveEventListener.call(window, type, listener);
  });
  listeners.length = 0; // Vaciar el array
}

let mockConfig: any;

const mockGetEnvironment = jest.fn() as jest.MockedFunction<typeof getEnvironment>;
mockGetEnvironment.mockReturnValue(EnumEnvironments.INT);
jest.unstable_mockModule('@proteo/environment-detection-utils', () => ({
  getEnvironment: mockGetEnvironment
}));

const mockAppendElementScript = jest.fn() as jest.MockedFunction<typeof appendElementScript>;
mockAppendElementScript.mockImplementation((_scriptElement, onloadFunction) => {
  if (onloadFunction) {
    onloadFunction();
  }
  return Promise.resolve([true, 'true']);
});
jest.unstable_mockModule('@proteo/script-initialization-util', () => ({
  appendElementScript: mockAppendElementScript
}));

const mockError = jest.fn();
const mockDebug = jest.fn();
let querySelectorSpy: MockInstance<any>;

const mockIsAlertBoxClosedAndValid = jest.fn() as jest.MockedFunction<any>;

describe('cookies-policy-utils', () => {
  let initializeCookiesPolicy: any;

  beforeEach(async () => {
    await import('@proteo/environment-detection-utils');
    await import('@proteo/script-initialization-util');
    ({ initializeCookiesPolicy } = await import('../cookies-policy-utils'));
    mockConfig = {
      COOKIES_MANAGER_CONFIG: {
        ACTIVATED: true
      }
    };
    LoggerUtils.prototype.error = mockError;
    LoggerUtils.prototype.debug = mockDebug;
    querySelectorSpy = jest.spyOn(document, 'querySelector');
    //@ts-ignore apparently not included in global scope
    global.OneTrust = {
      IsAlertBoxClosedAndValid: mockIsAlertBoxClosedAndValid
    };
    mockIsAlertBoxClosedAndValid.mockReturnValue(true);

    TagManager.initInstance = jest.fn() as jest.MockedFunction<typeof TagManager.initInstance>;
  });

  afterEach(() => {
    jest.clearAllMocks();
    removeAllWindowEventListeners();
  });

  describe('initialization', () => {
    it('should log an error if missing config', async () => {
      expect.assertions(2);
      delete mockConfig.COOKIES_MANAGER_CONFIG;
      await expect(initializeCookiesPolicy(mockConfig)).rejects.toBe(false);
      expect(mockError).toHaveBeenCalledWith('[Cookies Policy Utils] Missing configuration', { remoteLogger: true, type: 'application' });
    });

    it('should log an error if already initialized', async () => {
      expect.assertions(2);
      querySelectorSpy.mockReturnValueOnce('true');
      await expect(initializeCookiesPolicy(mockConfig)).rejects.toBe(false);
      expect(mockError).toHaveBeenCalledWith('[Cookies Policy Utils] Already initialized', { remoteLogger: true, type: 'application' });
    });

    it('should initialize scripts properly', async () => {
      expect.assertions(2);
      await expect(initializeCookiesPolicy(mockConfig)).resolves.toBe(true);
      expect(mockAppendElementScript).toHaveBeenCalledTimes(3);
    });
  });

  describe('onetrust event processing', () => {
    it('should process event onetrust after initialization', async () => {
      expect.assertions(1);
      await initializeCookiesPolicy(mockConfig);
      window.dispatchEvent(new Event('event_onetrust'));
      expect(mockDebug).toHaveBeenCalledTimes(3);
    });

    it('should also initialize tagManager if config is available', async () => {
      expect.assertions(2);
      mockConfig.TAG_MANAGER_CONFIG = {
        DRIVERS: [{ DRIVER: 'TXP4' }]
      };
      await initializeCookiesPolicy(mockConfig);
      window.dispatchEvent(new Event('event_onetrust'));
      expect(mockDebug).toHaveBeenCalledTimes(3);
      expect(TagManager.initInstance).toHaveBeenCalled();
    });
  });
});
