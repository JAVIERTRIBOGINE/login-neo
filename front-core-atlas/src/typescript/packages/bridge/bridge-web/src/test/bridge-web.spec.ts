import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { EVENT_BUS_PUBLISH_EVENT_NAME, EVENT_BUS_SUBSCRIBE_EVENT_NAME } from '@proteo/event-bus';
import { LoggerUtils } from '@proteo/logger-utils';
import type { EventBusSubscribe } from '@proteo/types';
import { BridgeWeb } from '../bridge-web';

describe('Proteo4 BSM Bridge', () => {
  LoggerUtils.prototype.debug = jest.fn();
  LoggerUtils.prototype.error = jest.fn();
  LoggerUtils.prototype.warn = jest.fn();
  let bridge: BridgeWeb;

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.clearAllMocks();
    bridge.destroy();
  });

  describe('native operation', () => {
    it('should call window.parent.postMessage', (done) => {
      jest.spyOn(window.parent, 'postMessage') as jest.MockedFunction<typeof window.parent.postMessage>;
      bridge = new BridgeWeb();
      window.addEventListener('message', () => done());
      const operation = 'test_operation';
      const callbackId = 'test_callback_id';
      const data = { test: true };
      bridge.nativeOperation(operation, callbackId, data);
      const message = { operation, callbackId, data };
      expect(window.parent.postMessage).toHaveBeenCalledWith(message, '*');
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

    it("should add message's listener", () => {
      jest.spyOn(window, 'addEventListener') as jest.MockedFunction<typeof window.addEventListener>;
      bridge = new BridgeWeb();
      expect(window.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('should call the bridge callback on message when callbackId is provided', (done) => {
      mockEventBus('test_method');
      BridgeWeb.prototype.nativeOperation = jest.fn().mockImplementation((__, callbackId, data): void => {
        window.postMessage({ response: data, callbackId }, '*');
      });
      const onSubscribe = (event: CustomEvent): void => {
        const detail = {
          topic: 'TEST_RESPONSE',
          detail: {
            test: true
          }
        };
        expect(event.detail).toStrictEqual(detail);
        window.removeEventListener(EVENT_BUS_PUBLISH_EVENT_NAME as keyof WindowEventMap, onSubscribe as EventListener);
        done();
      };
      window.addEventListener(EVENT_BUS_PUBLISH_EVENT_NAME as keyof WindowEventMap, onSubscribe as EventListener);
      bridge = new BridgeWeb(['TEST']);
      unmockEventBus();
    });

    it('should call the bridge callback on message when operation is provided', (done) => {
      mockEventBus('test_method');
      BridgeWeb.prototype.nativeOperation = jest.fn().mockImplementation((operation, __, data): void => {
        window.postMessage({ response: data, operation }, '*');
      });
      const onSubscribe = (event: CustomEvent): void => {
        const detail = {
          topic: 'test_method',
          detail: {
            test: true
          }
        };
        expect(event.detail).toStrictEqual(detail);
        window.removeEventListener(EVENT_BUS_PUBLISH_EVENT_NAME as keyof WindowEventMap, onSubscribe as EventListener);
        done();
      };
      window.addEventListener(EVENT_BUS_PUBLISH_EVENT_NAME as keyof WindowEventMap, onSubscribe as EventListener);
      bridge = new BridgeWeb(['TEST']);
      unmockEventBus();
    });
  });
});
