import { beforeEach, describe, jest } from '@jest/globals';
import { LoggerUtils } from '@proteo/logger-utils';
import type { BridgeRequest, NativeCallback } from '@proteo/types';
import { BridgeBSM } from '../bridge-bsm';

const callbackMock = jest.fn();
class BridgeDevice extends BridgeBSM {
  nativeOperation(operation: string, callbackId: string, data: unknown) {
    LoggerUtils.getInstance().debug(operation, callbackId, data);
  }
  // Protected method mocked to simplify test. This meth}d is already tested on @proteo/bridge
  protected bridgeGetCallback(callbackId: string): NativeCallback {
    return callbackId === '1234'
      ? (payload?: BridgeRequest) => callbackMock(callbackId, payload)
      : () => {
          throw new Error(`ERROR retrieving the callback from the map for callback id: ${callbackId}`);
        };
  }
}

describe('Proteo4 BSM Bridge', () => {
  LoggerUtils.prototype.debug = jest.fn();
  LoggerUtils.prototype.error = jest.fn();
  LoggerUtils.prototype.warn = jest.fn();
  let bridgeDevice: BridgeDevice;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, 'addEventListener');
    jest.spyOn(window, 'removeEventListener');
    bridgeDevice = new BridgeDevice();
  });

  afterEach(() => {
    bridgeDevice.destroy();
  });

  it('should add a BSMBridge listener', () => {
    expect(window.addEventListener).toBeCalledWith('BSMBridge', expect.any(Function));
  });
  it('should add a BSMBridge listener only once', () => {
    bridgeDevice.setNativeBridgeEventListener();
    expect(window.addEventListener).toBeCalledTimes(1);
  });
  it('should remove eventListener', () => {
    bridgeDevice.destroy();
    expect(window.removeEventListener).toBeCalledWith('BSMBridge', expect.any(Function));
  });

  describe('onBridgeEvent', () => {
    it("should throw an error if BSMBridge event don't provide data or detail", () => {
      const event = new CustomEvent('BSMBridge');
      window.dispatchEvent(event);
      expect(LoggerUtils.getInstance().error).toBeCalledWith(expect.stringContaining('Data response malformed'));
    });

    it('should throw error if data or detail is not a stringified JSON', () => {
      const detail = { any: 'data' };
      const event = new CustomEvent('BSMBridge', { detail });
      window.dispatchEvent(event);
      expect(LoggerUtils.prototype.error).toHaveBeenCalledWith(expect.stringContaining('ERROR executing the callback'));
    });

    it('should throw error if it is not possible to get the callback', () => {
      const detail = JSON.stringify({ any: 'data' });
      const event = new CustomEvent('BSMBridge', { detail });
      window.dispatchEvent(event);
      expect(LoggerUtils.prototype.error).toHaveBeenCalledWith(expect.stringContaining('ERROR executing the callback'));
    });

    it('should run the callback if it is found', () => {
      const detail = JSON.stringify({ callbackId: '1234' });
      const event = new CustomEvent('BSMBridge', { detail });
      window.dispatchEvent(event);
      expect(callbackMock).toHaveBeenCalledWith('1234', undefined);
    });

    it('should run the callback with the parsed event response data', () => {
      jest.spyOn(window, 'decodeURIComponent');
      const detail = JSON.stringify({ callbackId: '1234', response: '%7B%22method%22%3A%22mock%22%7D' });
      const event = new CustomEvent('BSMBridge', { detail });
      window.dispatchEvent(event);
      expect(decodeURIComponent).toBeCalledWith('%7B%22method%22%3A%22mock%22%7D');
      expect(callbackMock).toHaveBeenCalledWith('1234', { method: 'mock' });
    });
  });
});
