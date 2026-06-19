import { beforeEach, afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { EVENT_BUS_SUBSCRIBE_EVENT_NAME } from '@proteo/event-bus';
import { LoggerUtils } from '@proteo/logger-utils';
import type { EeNativeOperationPayload, EventBusSubscribe } from '@proteo/types';
import { BridgeWebEE } from '../bridge-web-ee';

describe('Proteo4 BSM Bridge', () => {
  LoggerUtils.prototype.debug = jest.fn();
  LoggerUtils.prototype.error = jest.fn();
  LoggerUtils.prototype.warn = jest.fn();
  let bridge: BridgeWebEE;

  afterEach(() => {
    jest.resetAllMocks();
    bridge.destroy();
  });

  describe('native operation', () => {
    it('should call window.eclipseDesktop.sendP4', () => {
      expect.assertions(1);
      window.eclipseDesktop = {
        sendP4: jest.fn()
      };
      bridge = new BridgeWebEE();
      const operation = 'test_operation';
      const callbackId = 'test_callback_id';
      const data = { test: true } as unknown as EeNativeOperationPayload;
      bridge.nativeOperation(operation, callbackId, data);
      const message = { operation, callbackId, data };
      expect(window.eclipseDesktop.sendP4).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('should call window.eclipseDesktop.send when type is EE_operative', () => {
      expect.assertions(1);
      window.eclipseDesktop = {
        send: jest.fn()
      };
      bridge = new BridgeWebEE();
      const operation = 'test_operation';
      const callbackId = 'test_callback_id';
      const data = { test: true, type: 'EE_operative', msg: 'test' };
      bridge.nativeOperation(operation, callbackId, data);
      expect(window.eclipseDesktop.send).toHaveBeenCalledWith('test_operation,test');
    });

    it('should call initBridge on window.eclipseDesktop.sendP4 null', () => {
      expect.assertions(4);
      jest.spyOn(window, 'addEventListener') as jest.MockedFunction<typeof window.addEventListener>;
      window.eclipseDesktop = {
        send: jest.fn()
      };

      bridge = new BridgeWebEE();
      const operation = 'initBridge';
      const callbackId = 'test_callback_id';
      const data = { test: true } as unknown as EeNativeOperationPayload;
      bridge.nativeOperation(operation, callbackId, data);
      expect(window.eclipseDesktop.sendP4).toBeUndefined();
      expect((window as any).getLanguage).toBeDefined();
      expect(window.addEventListener).toHaveBeenCalledWith('webEEBridge', expect.any(Function));
      (window as any).getLanguage({});
      expect((window as any).getLanguage).toBeUndefined();
    });

    it('should throw an error if no callbackId is defined', () => {
      expect.assertions(2);
      jest.spyOn(window, 'addEventListener') as jest.MockedFunction<typeof window.addEventListener>;
      window.eclipseDesktop = {
        send: jest.fn()
      };

      bridge = new BridgeWebEE();
      const operation = 'initBridge';
      const data = { test: true } as unknown as EeNativeOperationPayload;
      bridge.nativeOperation(operation, undefined as unknown as string, data);
      expect(window.addEventListener).toHaveBeenCalledWith('webEEBridge', expect.any(Function));
      (window as any).getLanguage({});
      expect(LoggerUtils.prototype.error).toHaveBeenCalledWith('[BridgeWebEE] Data response malformed');
    });
  });

  describe('native bridge event listener', () => {
    let subscribeMock: (event: Event) => void;
    const mockEventBus = (method: string) => {
      // Fake pubsub subscription
      subscribeMock = (event) => {
        const { topic, callback } = (event as CustomEvent<EventBusSubscribe>).detail;
        callback(topic, {
          method: method,
          data: { test: true }
        });
      };
      window.addEventListener(EVENT_BUS_SUBSCRIBE_EVENT_NAME, subscribeMock);
    };

    const unmockEventBus = () => {
      window.removeEventListener(EVENT_BUS_SUBSCRIBE_EVENT_NAME, subscribeMock);
    };

    beforeAll(() => {
      window.eclipseDesktop = {
        sendP4: jest.fn()
      };
    });

    it("should add webEEBridge's listener", () => {
      jest.spyOn(window, 'addEventListener') as jest.MockedFunction<typeof window.addEventListener>;
      bridge = new BridgeWebEE();
      expect(window.addEventListener).toHaveBeenCalledWith('webEEBridge', expect.any(Function));
    });

    it('should call the bridge callback on message when callbackId is provided', (done) => {
      expect.assertions(2);
      window.eclipseDesktop = {
        sendP4: jest.fn((msg: string) => {
          const data = JSON.parse(msg);
          window.dispatchEvent(
            new CustomEvent('webEEBridge', {
              detail: {
                callbackId: data.callbackId,
                response: { test: true }
              }
            })
          );
        })
      };
      mockEventBus('test_method');
      jest.spyOn(BridgeWebEE.prototype, 'nativeOperation') as jest.MockedFunction<typeof BridgeWebEE.prototype.nativeOperation>;
      const onBridgeEvent = (event: CustomEvent): void => {
        const detail = {
          callbackId: expect.any(String),
          response: {
            test: true
          }
        };
        expect(event.detail).toStrictEqual(detail);
        window.removeEventListener('webEEBridge', onBridgeEvent as EventListener);
        done();
      };
      window.addEventListener('webEEBridge', onBridgeEvent as EventListener);
      bridge = new BridgeWebEE(['TEST']);
      expect(bridge.nativeOperation).toHaveBeenCalledWith('test_method', expect.any(String), { test: true });
      unmockEventBus();
    });
  });

  describe('proteoSync', () => {
    let dispatchEventSpy: any;
    beforeEach(() => {
      dispatchEventSpy = jest.spyOn(global, 'dispatchEvent');
      window.proteoSync = undefined as any;
      bridge = new BridgeWebEE();
    });

    it('should create proteoSync method on window scope', () => {
      expect.assertions(4);
      expect(window.proteoSync).toBeTruthy();
      expect(window.proteoSync.callbackSibisEbranch).toBeTruthy();
      expect(window.proteoSync.callbackSibisEbranchWithoutOutput).toBeTruthy();
      expect(window.proteoSync.getUuid).toBeTruthy();
    });

    it('should keep uuid and fire wakeUpP4 event on callbackSibisEbranch call', () => {
      expect.assertions(4);
      const testUuid = '1234-abcd';
      window.proteoSync.callbackSibisEbranch(testUuid);
      expect(window.proteoSync.getUuid()).toBe(testUuid);
      expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
      const dispatchedEvent = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      expect(dispatchedEvent.type).toBe('wakeUpP4');
      expect(dispatchedEvent.detail).toEqual({ data: testUuid });
    });

    it('should keep uuid and fire wakeUpP4NP event on callbackSibisEbranchWithoutOutput call', () => {
      expect.assertions(4);
      const testUuid = '5678-efgh';
      window.proteoSync.callbackSibisEbranchWithoutOutput(testUuid);
      expect(window.proteoSync.getUuid()).toBe(testUuid);
      expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
      const dispatchedEvent = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      expect(dispatchedEvent.type).toBe('wakeUpP4NP');
      expect(dispatchedEvent.detail).toEqual({ data: testUuid });
    });

    it('should log and fire webEEBridge event on callbackGetContext call', () => {
      expect.assertions(4);
      const mockCallbackId = 'call-123';
      const mockResponse = 'success';
      window.proteoSync.callbackGetContext(mockCallbackId, mockResponse);
      expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith('Event received from EE', mockCallbackId, mockResponse);
      expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
      const dispatchedEvent = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      expect(dispatchedEvent.type).toBe('webEEBridge');
      expect(dispatchedEvent.detail).toEqual({
        callbackId: mockCallbackId,
        response: mockResponse
      });
    });

    it('should return undefined when calling getUuid before any callback call', () => {
      expect(window.proteoSync.getUuid()).toBeUndefined();
    });
  });
});
