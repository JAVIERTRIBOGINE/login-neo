import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LoggerUtils } from '@proteo/logger-utils';
import type {
  BridgeRequest,
  BsEventBusCallback,
  EventBusPublish,
  EventBusSubscribe,
  IEventManager
} from '@proteo/types';
import {
  EVENT_BUS_PUBLISH_EVENT_NAME,
  EVENT_BUS_SUBSCRIBE_EVENT_NAME,
  EVENT_BUS_UNSUBSCRIBE_EVENT_NAME,
  EVENT_BUS_UNSUBSCRIBE_TOKEN
} from '../constants.js';

jest.useFakeTimers();

const createUUIDMock = jest.fn();
const matchesUUIDMock = jest.fn();
jest.unstable_mockModule('@proteo/uuid-utils', () => ({
  createUUID: createUUIDMock,
  matchesUUID: matchesUUIDMock
}));

describe('EventManager test', () => {
  let EventManager: any;

  beforeEach(async () => {
    ({ EventManager } = await import('../event-manager.js'));
    LoggerUtils.prototype.warn = jest.fn();
    LoggerUtils.prototype.error = jest.fn();
    createUUIDMock.mockReturnValue('mockUUID');
    matchesUUIDMock.mockReturnValue(true);
  });

  afterEach(() => {
    window.BsEventManager = undefined as any;
    window.BsEventDictionary = undefined as any;
    jest.resetAllMocks();
  });

  describe('initialization', () => {
    it('should create the instance when initiated ', () => {
      expect.assertions(1);
      EventManager.initInstance('TestApp', '1.0.0-MOCK', { TIMEOUT: 10000 });
      expect(EventManager.getInstance()).toBeInstanceOf(EventManager);
    });

    it('should set the instance with default timeout when timeout not set', () => {
      expect.assertions(1);
      EventManager.initInstance('TestApp', '1.0.0-MOCK');
      expect((EventManager.getInstance() as any).eventResponseTimeout).toEqual(10000);
    });

    it('should set the unique events dictionary if provided', () => {
      expect.assertions(2);
      EventManager.initInstance('TestApp', '1.0.0-MOCK', { UNIQUE_EVENTS: ['UniqueEventTest'], TIMEOUT: 10000 });
      expect(window.BsEventDictionary).toBeTruthy();
      expect(window.BsEventDictionary.get('UniqueEventTest')).toEqual(false);
    });

    it('should not create the unique events dictionary if provided empty', () => {
      expect.assertions(1);
      EventManager.initInstance('TestApp', '1.0.0-MOCK', { UNIQUE_EVENTS: [], TIMEOUT: 10000 });
      expect(window.BsEventDictionary).toBeFalsy();
    });

    it('should create an instance with empty information when getting the instance if it is not already created', () => {
      expect.assertions(3);

      (EventManager as any)._instance = null;
      (window as any).BsEventManager = null;

      const initSpy = jest.spyOn(EventManager, 'initInstance');
      const eventManagerInstance = EventManager.getInstance();

      expect(eventManagerInstance).toBeInstanceOf(EventManager);
      expect(initSpy).toHaveBeenCalledTimes(1);
      expect(initSpy).toHaveBeenCalledWith('', '', { TIMEOUT: 10000 });
    });
  });

  describe('publish', () => {
    let topicValue: string;
    let detailValue: any;
    let handler: any;
    let validation: string;

    beforeEach(() => {
      handler = (ev: Event) => {
        const detail = (ev as CustomEvent<EventBusPublish>).detail;
        switch (validation) {
          case 'detail':
            expect(detail.detail).toEqual(detailValue);
            break;
          case 'topic':
            expect(detail.topic).toBe(topicValue);
            break;
        }

        window.removeEventListener(EVENT_BUS_PUBLISH_EVENT_NAME, handler);
      };
      window.addEventListener(EVENT_BUS_PUBLISH_EVENT_NAME, handler);
    });

    afterEach(() => {
      window.removeEventListener(EVENT_BUS_PUBLISH_EVENT_NAME, handler);
    });
    describe('event detail formats', () => {
      it('should emit proper object when an event is published with a non object payload', () => {
        expect.assertions(1);
        EventManager.initInstance('TestApp', '1.0.0-MOCK', { TIMEOUT: 10000 });
        validation = 'detail';
        detailValue = {
          appID: 'TESTAPP',
          version: '1.0.0-MOCK',
          data: 'demoPayload'
        };
        EventManager.getInstance().publish('DEMO', 'demoPayload', { eventID: 'HELLO' });
      });

      it('should emit proper object when an event is published with an object payload with data attribute', () => {
        expect.assertions(1);
        EventManager.initInstance('TestApp', '1.0.0-MOCK', { TIMEOUT: 10000 });
        validation = 'detail';
        detailValue = {
          method: 'testOp',
          data: {
            appID: 'TESTAPP',
            version: '1.0.0-MOCK',
            info: 'infoTest'
          }
        };
        EventManager.getInstance().publish('DEMO', {
          method: 'testOp',
          data: {
            info: 'infoTest'
          }
        });
      });

      it('should emit proper object when an event is published with an object payload without data attribute', () => {
        expect.assertions(1);
        EventManager.initInstance('TestApp', '1.0.0-MOCK', { TIMEOUT: 10000 });
        validation = 'detail';
        detailValue = {
          method: 'testOp',
          data: {
            appID: 'TESTAPP',
            version: '1.0.0-MOCK'
          }
        };
        EventManager.getInstance().publish('DEMO', {
          method: 'testOp'
        });
      });

      it('should emit proper object when an event is published without payload', () => {
        expect.assertions(1);
        EventManager.initInstance('TestApp', '1.0.0-MOCK', { TIMEOUT: 10000 });
        validation = 'detail';
        detailValue = {
          appID: 'TESTAPP',
          data: undefined,
          version: '1.0.0-MOCK'
        };
        EventManager.getInstance().publish('DEMO');
      });
    });

    describe('topic composition', () => {
      it('should compose the default event ID properly when not setting the option', () => {
        expect.assertions(1);
        EventManager.initInstance('TestApp', '1.0.0-MOCK', { TIMEOUT: 10000 });
        validation = 'topic';
        topicValue = 'DEMO.TESTAPP';
        EventManager.getInstance().publish('DEMO');
      });

      it('should compose the event ID properly when setting the option', () => {
        expect.assertions(1);
        EventManager.initInstance('TestApp', '1.0.0-MOCK', { TIMEOUT: 10000 });
        validation = 'topic';
        topicValue = 'DEMO.HELLO.TESTAPP';
        EventManager.getInstance().publish('DEMO', undefined, { eventID: 'HELLO' });
      });
    });
  });

  describe('publishWithResponse', () => {
    describe('resolved', () => {
      let callback: BsEventBusCallback;
      let publishHandler: any;
      let subscribeHandler: any;
      let unsubscribeHandler: any;
      let validData: string;
      let validTopic: string;

      function removeHandlers() {
        window.removeEventListener(EVENT_BUS_PUBLISH_EVENT_NAME, publishHandler);
        window.removeEventListener(EVENT_BUS_SUBSCRIBE_EVENT_NAME, subscribeHandler);
        window.removeEventListener(EVENT_BUS_UNSUBSCRIBE_EVENT_NAME, unsubscribeHandler);
      }

      beforeEach(() => {
        publishHandler = () => {
          callback('test', validData);
        };
        subscribeHandler = (ev: Event) => {
          const detail = (ev as CustomEvent<EventBusSubscribe>).detail;
          callback = detail.callback;
          expect(detail.topic).toEqual(validTopic);
        };
        unsubscribeHandler = () => {
          removeHandlers();
        };
        window.addEventListener(EVENT_BUS_PUBLISH_EVENT_NAME, publishHandler);
        window.addEventListener(EVENT_BUS_SUBSCRIBE_EVENT_NAME, subscribeHandler);
        window.addEventListener(EVENT_BUS_UNSUBSCRIBE_EVENT_NAME, unsubscribeHandler);
      });

      afterEach(() => {
        removeHandlers();
      });

      it('should resolve the promise with the response and the event unsubscribed when an event is published expecting a response and there is', () => {
        expect.assertions(2);
        EventManager.initInstance('TestApp', '1.0.0-MOCK', { TIMEOUT: 10000 });
        validData = 'dataDemo';
        validTopic = 'DEMO_RESPONSE.mockUUID.TESTAPP';
        EventManager.getInstance()
          .publishWithResponse('DEMO', 'payload')
          .then((data: any) => {
            expect(data).toEqual('dataDemo');
          });
      });

      it('should consider the case where there is not payload and no custom ID specified', () => {
        expect.assertions(2);
        EventManager.initInstance('TestApp', '1.0.0-MOCK', { TIMEOUT: 10000 });
        validData = 'dataDemo';
        validTopic = 'DEMO_RESPONSE.mockUUID.TESTAPP';
        EventManager.getInstance()
          .publishWithResponse('DEMO')
          .then((data: any) => {
            expect(data).toEqual('dataDemo');
          });
      });

      it('should work with payload objects', () => {
        expect.assertions(2);
        EventManager.initInstance('TestApp', '1.0.0-MOCK', { TIMEOUT: 10000 });
        validData = 'dataDemo';
        validTopic = 'DEMO_RESPONSE.mockUUID.TESTAPP';
        EventManager.getInstance()
          .publishWithResponse('DEMO', { data: 'mockData' })
          .then((data: any) => {
            expect(data).toEqual('dataDemo');
          });
      });

      it('should define custom ids for events if specified', () => {
        expect.assertions(2);
        EventManager.initInstance('TestApp', '1.0.0-MOCK', { TIMEOUT: 10000 });
        validData = 'dataDemo2';
        validTopic = 'DEMO_RESPONSE.customID.TESTAPP';
        EventManager.getInstance()
          .publishWithResponse('DEMO', 'payload', { customID: 'customID' })
          .then((data: any) => {
            expect(data).toEqual('dataDemo2');
          });
      });
    });

    it('should reject the promise with an error when an event is published expecting a response and there is no response', () => {
      expect.assertions(1);
      EventManager.initInstance('TestApp', '1.0.0-MOCK', { TIMEOUT: 10000 });
      const promiseInstance = EventManager.getInstance().publishWithResponse('DEMO', 'payload');
      jest.runAllTimers();
      return expect(promiseInstance).rejects.toContain('Timeout');
    });
  });

  describe('subscribe', () => {
    it('should emit a subscribe event into the event bus when subscribe method is fired', () => {
      expect.assertions(2);
      const spy = jest.fn<(ev: Event) => void>().mockImplementation((ev: Event) => {
        expect((ev as any).detail.topic).toEqual('MOCK_EVENT');
      });
      window.addEventListener(EVENT_BUS_SUBSCRIBE_EVENT_NAME, spy);

      EventManager.initInstance('TestApp', '1.0.0-MOCK', { TIMEOUT: 10000 });
      EventManager.getInstance().subscribe('MOCK_EVENT', jest.fn());
      window.removeEventListener(EVENT_BUS_SUBSCRIBE_EVENT_NAME, spy);
      expect(spy).toHaveBeenCalled();
    });

    it('should emit a subscribe event with custom ID into the event bus when set', () => {
      expect.assertions(2);
      const spy = jest.fn<(ev: Event) => void>().mockImplementation((ev: Event) => {
        expect((ev as any).detail.topic).toEqual('MOCK_EVENT.EVENT_ID.TESTAPP');
      });
      window.addEventListener(EVENT_BUS_SUBSCRIBE_EVENT_NAME, spy);

      EventManager.initInstance('TestApp', '1.0.0-MOCK', { TIMEOUT: 10000 });
      EventManager.getInstance().subscribe('MOCK_EVENT', jest.fn(), { eventID: 'EVENT_ID' });
      window.removeEventListener(EVENT_BUS_SUBSCRIBE_EVENT_NAME, spy);
      expect(spy).toHaveBeenCalled();
    });

    it('should resolve the subscribe promise with the token when tokenCallback is called', async () => {
      expect.assertions(1);
      EventManager.initInstance('TestApp', '1.0.0-MOCK', { TIMEOUT: 10000 });

      window.addEventListener(EVENT_BUS_SUBSCRIBE_EVENT_NAME, (ev: Event) => {
        const detail = (ev as CustomEvent<EventBusSubscribe & { tokenCallback?: (token: string) => void }>).detail;
        if (detail.tokenCallback) {
          detail.tokenCallback('MOCK_TOKEN');
        }
      });

      const token = await EventManager.getInstance().subscribe('EVENT_WITH_TOKEN', jest.fn());
      expect(token).toBe('MOCK_TOKEN');
    });

    it('should subscribe properly to a unique event the first time', async () => {
      expect.assertions(2);
      const spy = jest.fn();
      window.addEventListener(EVENT_BUS_SUBSCRIBE_EVENT_NAME, spy);

      EventManager.initInstance('TestApp', '1.0.0-MOCK', { UNIQUE_EVENTS: ['UniqueEventTest'], TIMEOUT: 10000 });
      EventManager.getInstance().subscribe('UniqueEventTest', jest.fn());
      expect(spy).toHaveBeenCalled();
      expect(window.BsEventDictionary.get('UniqueEventTest')).toEqual(true);
    });

    it('should not trigger callback if scope does not include APP_ID', () => {
      expect.assertions(1);
      const spy = jest.fn<(ev: Event) => void>().mockImplementation((ev: Event) => {
        const e = ev as CustomEvent<EventBusSubscribe>;
        e.detail.callback('MOCK_EVENT', {});
      });
      const callback = jest.fn();
      window.addEventListener(EVENT_BUS_SUBSCRIBE_EVENT_NAME, spy);

      EventManager.initInstance('TestApp', '1.0.0-MOCK', { TIMEOUT: 10000 });
      EventManager.getInstance().subscribe('MOCK_EVENT', callback);
      window.removeEventListener(EVENT_BUS_SUBSCRIBE_EVENT_NAME, spy);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should trigger callback if scope includes APP_ID', () => {
      expect.assertions(1);
      const spy = jest.fn<(ev: Event) => void>().mockImplementation((ev: Event) => {
        const e = ev as CustomEvent<EventBusSubscribe>;
        e.detail.callback('MOCK_EVENT.TESTAPP', {});
      });
      const callback = jest.fn();
      window.addEventListener(EVENT_BUS_SUBSCRIBE_EVENT_NAME, spy);

      EventManager.initInstance('TestApp', '1.0.0-MOCK', { TIMEOUT: 10000 });
      EventManager.getInstance().subscribe('MOCK_EVENT', callback);
      window.removeEventListener(EVENT_BUS_SUBSCRIBE_EVENT_NAME, spy);
      expect(callback).toHaveBeenCalled();
    });

    it('should not trigger callback if no eventID is specified but found', () => {
      expect.assertions(1);
      matchesUUIDMock.mockReturnValueOnce(false);
      const spy = jest.fn<(ev: Event) => void>().mockImplementation((ev: Event) => {
        const e = ev as CustomEvent<EventBusSubscribe>;
        e.detail.callback('MOCK_EVENT.EVENT_ID.TESTAPP', {});
      });
      const callback = jest.fn();
      window.addEventListener(EVENT_BUS_SUBSCRIBE_EVENT_NAME, spy);

      EventManager.initInstance('TestApp', '1.0.0-MOCK', { TIMEOUT: 10000 });
      EventManager.getInstance().subscribe('MOCK_EVENT', callback);
      window.removeEventListener(EVENT_BUS_SUBSCRIBE_EVENT_NAME, spy);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should trigger callback if eventID is specified and found', () => {
      expect.assertions(1);
      const spy = jest.fn<(ev: Event) => void>().mockImplementation((ev: Event) => {
        const e = ev as CustomEvent<EventBusSubscribe>;
        e.detail.callback('MOCK_EVENT.EVENT_ID.TESTAPP', {});
      });
      const callback = jest.fn();
      window.addEventListener(EVENT_BUS_SUBSCRIBE_EVENT_NAME, spy);

      EventManager.initInstance('TestApp', '1.0.0-MOCK', { TIMEOUT: 10000 });
      EventManager.getInstance().subscribe('MOCK_EVENT', callback, { eventID: 'EVENT_ID' });
      window.removeEventListener(EVENT_BUS_SUBSCRIBE_EVENT_NAME, spy);
      expect(callback).toHaveBeenCalled();
    });

    it('should trigger callback if no eventID is specified and UUID is found', () => {
      expect.assertions(1);
      const spy = jest.fn<(ev: Event) => void>().mockImplementation((ev: Event) => {
        const e = ev as CustomEvent<EventBusSubscribe>;
        e.detail.callback('MOCK_EVENT.UUID.TESTAPP', {});
      });
      const callback = jest.fn();
      window.addEventListener(EVENT_BUS_SUBSCRIBE_EVENT_NAME, spy);

      EventManager.initInstance('TestApp', '1.0.0-MOCK', { TIMEOUT: 10000 });
      EventManager.getInstance().subscribe('MOCK_EVENT', callback);
      window.removeEventListener(EVENT_BUS_SUBSCRIBE_EVENT_NAME, spy);
      expect(callback).toHaveBeenCalled();
    });

    it('should display a warning and reject the promise when trying to subscribe to a unique event after the first time', async () => {
      expect.assertions(2);
      EventManager.initInstance('TestApp', '1.0.0-MOCK', { UNIQUE_EVENTS: ['UniqueEventTest'], TIMEOUT: 10000 });
      EventManager.getInstance().subscribe('UniqueEventTest', jest.fn());
      try {
        await EventManager.getInstance().subscribe('UniqueEventTest', jest.fn());
      } catch (e) {
        const message = "Couldn't subscribe to UniqueEventTest. Unique events can only be subscribed once";
        expect(LoggerUtils.prototype.warn).toBeCalledWith(message, expect.anything());
        expect(e).toEqual(message);
      }
    });
  });

  describe('unsubscribe', () => {
    it('should emit an unsubscribe event into the event bus when unsubscribe method is fired', () => {
      expect.assertions(1);
      const spy = jest.fn();
      window.addEventListener(EVENT_BUS_UNSUBSCRIBE_TOKEN, spy);

      EventManager.initInstance('TestApp', '1.0.0-MOCK', { TIMEOUT: 10000 });
      EventManager.getInstance().unsubscribe('UNSUBSCRIBE_TOKEN');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('subscribeAndPublish', () => {
    it('should emit a publish an event into the event bus when the event is received', () => {
      expect.assertions(1);
      const spy = jest.fn();
      EventManager.prototype.publish = spy;

      window.addEventListener(EVENT_BUS_SUBSCRIBE_EVENT_NAME, (ev: Event) => {
        const detail = (ev as CustomEvent<EventBusSubscribe>).detail;
        detail.callback('MOCK_EVENT.TESTAPP', {});
      });

      EventManager.initInstance('TESTAPP', '1.0.0-MOCK', { TIMEOUT: 10000 });
      EventManager.getInstance().subscribeAndPublish('MOCK_EVENT', { data: 'value' });

      const eventRequest: EventBusPublish = {
        topic: 'MOCK_EVENT.TESTAPP',
        detail: {}
      };
      window.dispatchEvent(new CustomEvent(EVENT_BUS_PUBLISH_EVENT_NAME, { detail: eventRequest }));

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('subscribeForResponse', () => {
    let eventManager: IEventManager;
    let requestData: BridgeRequest;
    let topicToReceive: string | undefined;

    beforeEach(() => {
      EventManager.initInstance('TestApp', '1.0.0-MOCK', { TIMEOUT: 10000 });
      eventManager = EventManager.getInstance();
      topicToReceive = undefined;
      jest.spyOn(eventManager, 'subscribe').mockImplementation((msg, callback) => {
        callback(topicToReceive ?? msg, requestData);
        return Promise.resolve('mockToken');
      });
      jest.spyOn(eventManager, 'publish').mockImplementation(() => {
        void 0;
      });
    });

    it('should process event and publish with response without custom ID', async () => {
      expect.assertions(2);
      requestData = { method: 'mockMethod' };
      await eventManager.subscribeForResponse('MOCK_EVENT', (_message: string, _data) => {
        return { data: 'mockPatata' };
      });
      expect(eventManager.publish).toHaveBeenCalledTimes(1);
      expect(eventManager.publish).toHaveBeenCalledWith('MOCK_EVENT_RESPONSE', { data: 'mockPatata' }, undefined);
    });

    it('should process event and publish with response with delayed data', async () => {
      expect.assertions(2);
      requestData = { method: 'mockMethod' };
      eventManager.subscribeForResponse('MOCK_EVENT', async (_message: string, _data) => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { data: 'mockPatataDelayed' };
      });
      await jest.runAllTimersAsync();
      expect(eventManager.publish).toHaveBeenCalledTimes(1);
      expect(eventManager.publish).toHaveBeenCalledWith(
        'MOCK_EVENT_RESPONSE',
        { data: 'mockPatataDelayed' },
        undefined
      );
    });

    it('should process event and publish with response with custom ID', async () => {
      expect.assertions(2);
      requestData = { method: 'mockMethod' };
      topicToReceive = 'MOCK_EVENT.mock_ID';
      await eventManager.subscribeForResponse('MOCK_EVENT', (_message: string, _data) => {
        return { data: 'mockPatata' };
      });
      expect(eventManager.publish).toHaveBeenCalledTimes(1);
      expect(eventManager.publish).toHaveBeenCalledWith(
        'MOCK_EVENT_RESPONSE',
        { data: 'mockPatata' },
        { eventID: 'mock_ID' }
      );
    });

    it('should handle case without data from the subscription', async () => {
      expect.assertions(2);
      requestData = undefined as unknown as BridgeRequest;
      await eventManager.subscribeForResponse('MOCK_EVENT', (_message: string, _data) => {
        return { data: 'mockPatata' };
      });
      expect(eventManager.publish).not.toHaveBeenCalled();
      expect(LoggerUtils.prototype.error).toHaveBeenCalledWith(
        '[EventManager] [subscribeToRespond] Publish did not send data',
        {
          remoteLogger: true,
          type: 'application'
        }
      );
    });
  });
});
