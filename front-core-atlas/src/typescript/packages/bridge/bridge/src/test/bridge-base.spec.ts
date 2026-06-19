import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { EVENT_BUS_PUBLISH_EVENT_NAME, EVENT_BUS_SUBSCRIBE_EVENT_NAME } from '@proteo/event-bus';
import { LoggerUtils } from '@proteo/logger-utils';
import type { BridgeRequest } from '@proteo/types';
import { Bridge } from '../bridge.js';

describe('Bridge', () => {
  let fakeBridge: Bridge;
  let bridgeEventCallback: (msg: string, request: BridgeRequest) => void;

  const subscribeFunction = (ev: Event) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { detail } = ev as CustomEvent;
    LoggerUtils.getInstance().debug(detail.topic);
    bridgeEventCallback = detail.callback;
  };

  const publishFunction = (ev: Event) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { detail } = ev as CustomEvent;
    LoggerUtils.getInstance().debug(detail.topic);
  };

  const bridgeRequest: BridgeRequest = {
    method: 'fakeMethod',
    data: { test: 'test' }
  };
  /**
   * Fake bridge that extends base bridge with fake implementation
   */
  class FakeBridge extends Bridge {
    setNativeBridgeEventListener(): void {
      LoggerUtils.getInstance().debug('setNativeBridgeEventListener');
    }
    nativeOperation(operation: string, callbackId: string, data: unknown): void {
      LoggerUtils.getInstance().debug(operation, callbackId, data);
    }
  }

  beforeEach(() => {
    LoggerUtils.prototype.debug = jest.fn() as jest.Mocked<typeof LoggerUtils.prototype.debug>;
    global.addEventListener(EVENT_BUS_SUBSCRIBE_EVENT_NAME, subscribeFunction);
    global.addEventListener(EVENT_BUS_PUBLISH_EVENT_NAME, publishFunction);
    fakeBridge = new FakeBridge(['FAKE_1', 'FAKE_2', 'FAKE_3']);
  });

  afterEach(() => {
    global.removeEventListener(EVENT_BUS_SUBSCRIBE_EVENT_NAME, subscribeFunction);
    global.removeEventListener(EVENT_BUS_PUBLISH_EVENT_NAME, publishFunction);
  });

  it('When created Should be created', () => {
    expect.assertions(2);
    expect(fakeBridge).toBeDefined();
    expect(fakeBridge).toBeInstanceOf(Bridge);
  });

  it('When created Should register native bridge events', () => {
    expect.assertions(1);
    expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith('setNativeBridgeEventListener');
  });

  it('When created Should register all `window.proteoEventsToSubscribe` events', () => {
    expect.assertions(3);
    expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith('FAKE_1');
    expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith('FAKE_2');
    expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith('FAKE_3');
  });

  describe('When a bridge event is received from event BUS', () => {
    let currentTime: Date;
    let dateSpy: unknown;
    beforeEach(() => {
      /**
       * Randomize the date to avoid collisions
       */
      currentTime = new Date(Date.now() + Math.floor(Math.random() * 101));
      dateSpy = jest.spyOn(global, 'Date').mockImplementation(() => currentTime as never);
    });

    afterEach(() => {
      (dateSpy as jest.Mock).mockRestore();
    });

    it('it should save the callback and call the native implementation', () => {
      expect.assertions(1);
      bridgeEventCallback('FAKE', bridgeRequest);
      expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith('fakeMethod', currentTime.getTime().toString(), { test: 'test' });
    });

    it('and scoped topic is specified it should save the callback and call the native implementation', () => {
      expect.assertions(1);
      bridgeEventCallback('FAKE.MY_SCOPE.MY_SUB_SCOPE', bridgeRequest);
      expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith('fakeMethod', currentTime.getTime().toString(), { test: 'test' });
    });

    it('and empty topic is specified it should not save the callback and should call the native implementation', () => {
      expect.assertions(1);
      bridgeEventCallback('', bridgeRequest);
      expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith('fakeMethod', '', { test: 'test' });
    });

    it('and is concurrent with other event, it should delay de event to be managed by the bridge', () => {
      expect.assertions(2);
      (dateSpy as jest.Mock).mockRestore();
      const concurrentEventTime = new Date();
      const delayedEventTime = new Date(concurrentEventTime.getTime() + 100);
      let internalTimeIndex = 0;
      dateSpy = jest.spyOn(global, 'Date').mockImplementation((() => {
        const finalTime = internalTimeIndex < 2 ? concurrentEventTime : delayedEventTime;
        internalTimeIndex++;
        return finalTime as unknown as string;
      }) as never);
      const firstEventRequest: BridgeRequest = {
        method: 'FIRST_EVENT',
        data: { test: 'test' }
      };

      const secondEventRequest: BridgeRequest = {
        method: 'SECOND_EVENT',
        data: { test: 'test' }
      };
      bridgeEventCallback('FAKE_1', firstEventRequest);
      bridgeEventCallback('FAKE_2', secondEventRequest);
      expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith('FIRST_EVENT', concurrentEventTime.getTime().toString(), { test: 'test' });
      expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith('SECOND_EVENT', delayedEventTime.getTime().toString(), { test: 'test' });
    });
  });

  describe('When a bridge event is received from event BUS', () => {
    xit('and the callback exists, it must publish de response to the eventBus', () => {
      // TODO: Test WIP
      // expect.assertions(1);
      // class CallbackFakeBridge extends Bridge {
      //   constructor(actions: string[]) {
      //     super(actions);
      //   }
      //   setNativeBridgeEventListener(): void {
      //     window.addEventListener('FAKE_HOST_EVENT', (ev: Event) => {
      //       const payload = (ev as CustomEvent).detail;
      //       const cb = this.bridgeGetCallback(payload.callbackId);
      //       cb(payload.data);
      //     });
      //   }
      //   nativeOperation(operation: string, callbackId: string, data: unknown): void {
      //     LoggerUtils.getInstance().debug(operation, callbackId, data);
      //   }
      // }
      // new CallbackFakeBridge();
      // bridgeEventCallback('FAKE.MY_SCOPE.MY_SUB_SCOPE', bridgeRequest);
    });

    it('and the callback does not exists, it must throw a callback error', (done) => {
      expect.assertions(1);
      class ErrorFakeBridge extends Bridge {
        setNativeBridgeEventListener(): void {
          window.addEventListener('FAKE_HOST_EVENT', (ev: Event) => {
            const { detail: callbackId } = ev as CustomEvent;
            const errorMessage = `ERROR retrieving the callback from the map for callback id: ${callbackId}`;
            const callback = this.bridgeGetCallback(callbackId);
            expect(() => callback()).toThrowError(errorMessage);
            done();
          });
        }
        nativeOperation(operation: string, callbackId: string, data: unknown): void {
          LoggerUtils.getInstance().debug(operation, callbackId, data);
        }
      }
      new ErrorFakeBridge([]);
      window.dispatchEvent(new CustomEvent('FAKE_HOST_EVENT', { detail: '12343243242' }));
    });
  });
});
