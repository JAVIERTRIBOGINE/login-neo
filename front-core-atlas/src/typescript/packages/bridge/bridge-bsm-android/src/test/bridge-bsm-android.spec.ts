import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LoggerUtils } from '@proteo/logger-utils';
import { BridgeAndroid } from '../bridge-bsm-android';

describe('Proteo4 Android Bridge', () => {
  LoggerUtils.prototype.warn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('native operation', () => {
    it('should call bsmbridge.processMessage', () => {
      window.bsmbridge = {
        processMessage: jest.fn()
      };
      const data = { test: true };
      const bridge = new BridgeAndroid();
      bridge.nativeOperation('test_operation', '1234', data);
      expect(window.bsmbridge.processMessage).toHaveBeenCalledWith('test_operation', '1234', JSON.stringify(data));
      delete window.bsmbridge;
      bridge.destroy();
    });

    it('should offer ODP Legacy support', () => {
      window.bsmbridge = {
        test_operation: jest.fn()
      };
      const data = { test: true };
      const bridge = new BridgeAndroid();
      bridge.nativeOperation('test_operation', '1234', data);
      expect(window.bsmbridge.test_operation).toHaveBeenCalledWith('1234', JSON.stringify(data));
      delete window.bsmbridge;
      bridge.destroy();
    });

    it('should warn if bsmbridge functions fails', () => {
      window.bsmbridge = {
        processMessage: jest.fn().mockImplementation(() => {
          throw new Error('test error');
        })
      };
      const data = { test: true };
      const bridge = new BridgeAndroid();
      bridge.nativeOperation('test_operation', '1234', data);
      expect(LoggerUtils.prototype.warn).toHaveBeenCalledWith(
        '[BridgeBSM] - nativeOperation: bsm bridge not support operation <test_operation>',
        expect.any(Error)
      );
      delete window.bsmbridge;
      bridge.destroy();
    });
  });
});
