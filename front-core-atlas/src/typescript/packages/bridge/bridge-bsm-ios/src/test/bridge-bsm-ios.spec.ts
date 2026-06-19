import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LoggerUtils } from '@proteo/logger-utils';
import { BridgeIos } from '../bridge-bsm-ios';

describe('Proteo4 IOS Bridge', () => {
  LoggerUtils.prototype.warn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('native operation', () => {
    it('should call bsmbridge.processMessage', () => {
      window.webkit = {
        messageHandlers: {
          test_operation: {
            postMessage: jest.fn()
          }
        }
      };
      const bridge = new BridgeIos();
      const operation = 'test_operation';
      const callbackId = '1234';
      const data = { test: true };
      bridge.nativeOperation(operation, callbackId, data);
      const expected = JSON.stringify({
        callbackId,
        params: data
      });
      expect(window.webkit.messageHandlers.test_operation.postMessage).toHaveBeenCalledWith(expected);
      delete window.webkit;
      bridge.destroy();
    });

    it("should log a warn if operation doesn't exist", () => {
      const bridge = new BridgeIos();
      const operation = 'test_operation';
      const callbackId = '1234';
      const data = { test: true };
      bridge.nativeOperation(operation, callbackId, data);
      expect(LoggerUtils.prototype.warn).toHaveBeenCalledWith(
        `[BridgeBSM] - nativeOperation: bsm bridge not support operation <${operation}>`,
        expect.any(Error)
      );
      delete window.webkit;
      bridge.destroy();
    });
  });
});
