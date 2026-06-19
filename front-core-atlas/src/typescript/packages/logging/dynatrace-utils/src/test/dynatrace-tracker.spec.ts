import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { NativeRequestParams } from '../dynatrace.models.js';

const mockLoggerDebug = jest.fn();
jest.unstable_mockModule('@proteo/logger-utils', () => ({
  LoggerUtils: {
    getInstance: jest.fn().mockReturnValue({
      debug: mockLoggerDebug
    })
  }
}));

let isNativeMock = true;
jest.unstable_mockModule('@proteo/platform-utils', () => ({
  isNative: jest.fn(() => isNativeMock)
}));

const mockStorageGet = jest.fn();
const mockStorageSet = jest.fn();
const mockStorageRemove = jest.fn();
jest.unstable_mockModule('@proteo/storage-utils', () => ({
  StorageManager: {
    getInstance: jest.fn().mockReturnValue({
      get: mockStorageGet,
      set: mockStorageSet,
      remove: mockStorageRemove
    })
  }
}));

describe('DynatraceTracker', () => {
  let DynatraceTracker: any;

  beforeEach(async () => {
    jest.resetModules();

    ({ DynatraceTracker } = await import('../dynatrace-tracker.js'));

    isNativeMock = true;

    (window as any).bsStartDtNativeHttpTracking = undefined;
    (window as any).bsFinishDtNativeHttpTracking = undefined;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startNativeHttpTracking', () => {
    const defaultParams: NativeRequestParams = {
      requestId: 'req-123',
      url: 'https://api.test/endpoint',
      frameworkName: 'TestFramework'
    };

    it('should abort and log if not running in native environment', () => {
      expect.assertions(3);
      isNativeMock = false;

      const headers = DynatraceTracker.startNativeHttpTracking(defaultParams);

      expect(headers).toStrictEqual({});
      expect(mockLoggerDebug).toHaveBeenCalledWith(
        '[DynatraceTracker] Native http tracking start not allowed outside native.',
        expect.objectContaining({ remoteLogger: true })
      );
      expect(mockStorageSet).not.toHaveBeenCalled();
    });

    it('should log and return empty headers if window start method is not defined', () => {
      expect.assertions(3);

      const headers = DynatraceTracker.startNativeHttpTracking(defaultParams);

      expect(headers).toStrictEqual({});
      expect(mockLoggerDebug).toHaveBeenCalledWith(
        '[DynatraceTracker] Native http tracking start method not found.',
        expect.objectContaining({ remoteLogger: true })
      );
      expect(mockStorageSet).not.toHaveBeenCalled();
    });

    it('should call window tracking method, save actionId to storage, and return headers', () => {
      expect.assertions(3);

      const mockHeaders = { 'x-dtc': 'mock-dt-header' };
      (window as any).bsStartDtNativeHttpTracking = jest.fn().mockReturnValue({
        actionId: 99,
        headers: mockHeaders
      });

      const headers = DynatraceTracker.startNativeHttpTracking(defaultParams);

      expect((window as any).bsStartDtNativeHttpTracking).toHaveBeenCalledWith({
        url: defaultParams.url,
        frameworkName: defaultParams.frameworkName
      });
      expect(mockStorageSet).toHaveBeenCalledWith('req-123', 99);
      expect(headers).toStrictEqual(mockHeaders);
    });
  });

  describe('finishNativeHttpTracking', () => {
    it('should abort and log if not running in native environment', () => {
      expect.assertions(2);
      isNativeMock = false;

      DynatraceTracker.finishNativeHttpTracking('req-123');

      expect(mockLoggerDebug).toHaveBeenCalledWith('[DynatraceTracker] Native http tracking finish not allowed outside native.', expect.any(Object));
      expect(mockStorageGet).not.toHaveBeenCalled();
    });

    it('should abort and log if actionId is not found in storage', () => {
      expect.assertions(3);
      mockStorageGet.mockReturnValueOnce(undefined);

      DynatraceTracker.finishNativeHttpTracking('req-invalid');

      expect(mockStorageGet).toHaveBeenCalledWith('req-invalid');
      expect(mockLoggerDebug).toHaveBeenCalledWith(
        '[DynatraceTracker] Cannot finish tracking: no actionId found for requestId [req-invalid].',
        expect.any(Object)
      );
      expect(mockStorageRemove).not.toHaveBeenCalled();
    });

    it('should remove actionId from storage and log if window finish method is missing', () => {
      expect.assertions(3);
      mockStorageGet.mockReturnValueOnce(99);

      DynatraceTracker.finishNativeHttpTracking('req-123');

      expect(mockStorageRemove).toHaveBeenCalledWith('req-123');
      expect(mockLoggerDebug).toHaveBeenCalledWith('[DynatraceTracker] Native http tracking finish method not found.', expect.any(Object));
      expect((window as any).bsFinishDtNativeHttpTracking).toBeUndefined();
    });

    it('should correctly call window finish method if everything is fine', () => {
      expect.assertions(2);
      mockStorageGet.mockReturnValueOnce(99);
      (window as any).bsFinishDtNativeHttpTracking = jest.fn();

      const mockError = { statusCode: 500, message: 'Server error' };
      DynatraceTracker.finishNativeHttpTracking('req-123', mockError);

      expect(mockStorageRemove).toHaveBeenCalledWith('req-123');
      expect((window as any).bsFinishDtNativeHttpTracking).toHaveBeenCalledWith(99, mockError);
    });
  });

  describe('Logging Throttling (Local Module State)', () => {
    it('should allow normal logging for the first 3 occurrences', () => {
      expect.assertions(2);
      isNativeMock = false;

      for (let i = 0; i < 9; i++) {
        DynatraceTracker.startNativeHttpTracking({ requestId: `req-${i}`, url: '', frameworkName: '' });
      }

      expect(mockLoggerDebug).toHaveBeenCalledTimes(3);
      expect(mockLoggerDebug).toHaveBeenCalledWith('[DynatraceTracker] Native http tracking start not allowed outside native.', expect.any(Object));
    });

    it('should emit standard log AND a warning message on exactly the 2nd trigger', () => {
      expect.assertions(3);
      isNativeMock = false;

      for (let i = 0; i < 10; i++) {
        DynatraceTracker.startNativeHttpTracking({ requestId: `req-${i}`, url: '', frameworkName: '' });
      }

      expect(mockLoggerDebug).toHaveBeenCalledTimes(3);

      expect((mockLoggerDebug as any).mock.calls[1][0]).toBe('[DynatraceTracker] Native http tracking start not allowed outside native.');

      expect(mockLoggerDebug).toHaveBeenLastCalledWith(
        '[DynatraceTracker] 2 logs limit reached. No further logs from DynatraceTracker will be sent.',
        expect.any(Object)
      );
    });

    it('should strictly drop any logs after the 10th occurrence', () => {
      expect.assertions(1);
      isNativeMock = false;

      for (let i = 0; i < 25; i++) {
        DynatraceTracker.startNativeHttpTracking({ requestId: `req-${i}`, url: '', frameworkName: '' });
      }

      expect(mockLoggerDebug).toHaveBeenCalledTimes(3);
    });
  });
});
