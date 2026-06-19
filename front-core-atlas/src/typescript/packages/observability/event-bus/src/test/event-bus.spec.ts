import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LoggerUtils } from '@proteo/logger-utils';
import type { EventBusEvent, EventBusPublish, EventBusSubscribe } from '@proteo/types';
import PubSub from 'pubsub-js';
import {
  EVENT_BUS_PUBLISH_EVENT_NAME,
  EVENT_BUS_SUBSCRIBE_EVENT_NAME,
  EVENT_BUS_UNSUBSCRIBE_EVENT_NAME,
  EVENT_BUS_UNSUBSCRIBE_TOKEN
} from '../constants.js';
import { EventBus } from '../event-bus.js';

describe('EventBus', () => {
  let eventBus: EventBus;
  let pubSpy: unknown;
  let subSpy: unknown;
  let unSubSpy: unknown;

  beforeEach(() => {
    eventBus = new EventBus();
    LoggerUtils.prototype.debug = jest.fn() as jest.Mocked<typeof LoggerUtils.prototype.debug>;
    pubSpy = jest.spyOn(PubSub, 'publish') as jest.Mocked<typeof PubSub.publish>;
    subSpy = jest.spyOn(PubSub, 'subscribe') as jest.Mocked<typeof PubSub.subscribe>;
    unSubSpy = jest.spyOn(PubSub, 'unsubscribe') as jest.Mocked<typeof PubSub.unsubscribe>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('builds', () => {
    expect(eventBus).toBeTruthy();
  });

  it('should subscribe a new event when dispatch EVENT_BUS_SUBSCRIBE_EVENT_NAME event', (done) => {
    const myCallback = jest.fn();
    const event: EventBusSubscribe = { topic: 'SIGN.MY_ID', callback: myCallback };
    window.dispatchEvent(new CustomEvent(EVENT_BUS_SUBSCRIBE_EVENT_NAME, { detail: event }));

    setTimeout(() => {
      expect(subSpy).toHaveBeenCalled();
      done();
    }, 0);
  });

  it('should call tokenCallback with the subscription token when provided in the event detail', (done) => {
    const myCallback = jest.fn();
    const tokenCallback = jest.fn();
    const event: EventBusSubscribe & { tokenCallback?: (token: string) => void } = {
      topic: 'SIGN.MY_ID',
      callback: myCallback,
      tokenCallback
    };

    (subSpy as jest.Mock).mockReturnValue('MOCK_TOKEN');

    window.dispatchEvent(new CustomEvent(EVENT_BUS_SUBSCRIBE_EVENT_NAME, { detail: event }));

    setTimeout(() => {
      expect(subSpy).toHaveBeenCalledWith('SIGN.MY_ID', myCallback);
      expect(tokenCallback).toHaveBeenCalledWith('MOCK_TOKEN');
      expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith(
        '[EventBus - SUBSCRIBE]',
        event,
        expect.objectContaining({ remoteLogger: true, type: 'application' })
      );
      done();
    }, 0);
  });

  it('should not throw or call tokenCallback if it is not a function', (done) => {
    const myCallback = jest.fn();
    const event: EventBusSubscribe & { tokenCallback?: unknown } = {
      topic: 'SIGN.MY_ID',
      callback: myCallback,
      tokenCallback: undefined
    };

    window.dispatchEvent(new CustomEvent(EVENT_BUS_SUBSCRIBE_EVENT_NAME, { detail: event }));

    setTimeout(() => {
      expect(subSpy).toHaveBeenCalledWith('SIGN.MY_ID', myCallback);
      expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith(
        '[EventBus - SUBSCRIBE]',
        event,
        expect.objectContaining({ remoteLogger: true, type: 'application' })
      );
      done();
    }, 0);
  });

  it('should unsubscribe using a token when dispatch EVENT_BUS_UNSUBSCRIBE_TOKEN event', (done) => {
    const token = 'UNSUBSCRIBE_TOKEN';

    window.dispatchEvent(new CustomEvent(EVENT_BUS_UNSUBSCRIBE_TOKEN, { detail: token }));

    setTimeout(() => {
      expect(unSubSpy).toHaveBeenCalledWith(token);
      expect(LoggerUtils.prototype.debug).toHaveBeenCalledWith(
        '[EventBus - UNSUBSCRIBE WITH TOKEN]',
        token,
        expect.objectContaining({ remoteLogger: true, type: 'application' })
      );
      done();
    }, 0);
  });

  it('should publish a new event when dispatch EVENT_BUS_PUBLISH_EVENT_NAME event', (done) => {
    const event: EventBusPublish = { topic: 'SIGN.RESPONSE.MY_ID', detail: { data: 'my_data' } };
    window.dispatchEvent(new CustomEvent(EVENT_BUS_PUBLISH_EVENT_NAME, { detail: event }));

    setTimeout(() => {
      expect(pubSpy).toHaveBeenCalled();
      done();
    }, 0);
  });

  it('should unsubscribe a a topic', () => {
    const event: EventBusEvent = { topic: 'SIGN.RESPONSE' };
    eventBus.unSubscribe(event);
    expect(unSubSpy).toHaveBeenCalled();
  });

  it('should publish a new event when dispatch EVENT_BUS_PUBLISH_EVENT_NAME event', (done) => {
    const event: EventBusPublish = { topic: 'SIGN.RESPONSE.MY_ID', detail: { data: 'my_data' } };
    window.dispatchEvent(new CustomEvent(EVENT_BUS_PUBLISH_EVENT_NAME, { detail: event }));

    setTimeout(() => {
      expect(pubSpy).toHaveBeenCalled();
      done();
    }, 0);
  });

  it('should publish a new event when to use the publish function', () => {
    const event: EventBusPublish = { topic: 'SIGN.RESPONSE.MY_ID', detail: { data: 'my_data' } };
    eventBus.publish(event);
    expect(pubSpy).toHaveBeenCalled();
  });
  it('should execute the callback of a subscriber when a publish event is received', (done) => {
    expect.assertions(1);
    const myCallback = jest.fn();
    const event: EventBusSubscribe = {
      topic: 'SIGN',
      scope: 'MY_ID',
      callback: myCallback
    };
    window.dispatchEvent(new CustomEvent(EVENT_BUS_SUBSCRIBE_EVENT_NAME, { detail: event }));

    setTimeout(() => {
      const eventPublish: EventBusPublish = { topic: 'SIGN', scope: 'MY_ID', detail: { data: 'my_data' } };
      window.dispatchEvent(new CustomEvent(EVENT_BUS_PUBLISH_EVENT_NAME, { detail: eventPublish }));
      setTimeout(() => {
        expect(myCallback).toHaveBeenCalledWith('SIGN.MY_ID', { data: 'my_data' });
        done();
      }, 0);
    }, 0);
  });

  it('should execute the callback of a subscriber when the subscriber use a open Topic, but the publisher uses a specific topic', (done) => {
    expect.assertions(1);
    const myCallback = jest.fn();
    const event: EventBusSubscribe = {
      topic: 'SIGN',
      callback: myCallback
    };
    window.dispatchEvent(new CustomEvent(EVENT_BUS_SUBSCRIBE_EVENT_NAME, { detail: event }));

    setTimeout(() => {
      const eventPublish: EventBusPublish = { topic: 'SIGN', scope: 'MY_ID', detail: { data: 'my_data' } };
      window.dispatchEvent(new CustomEvent(EVENT_BUS_PUBLISH_EVENT_NAME, { detail: eventPublish }));
      setTimeout(() => {
        expect(myCallback).toHaveBeenCalledWith('SIGN.MY_ID', { data: 'my_data' });
        done();
      }, 0);
    }, 0);
  });

  it('should unsubscribe a topic', (done) => {
    expect.assertions(3);
    const myCallback = jest.fn();
    const event: EventBusSubscribe = {
      topic: 'SIGN',
      scope: 'MY_ID',
      callback: myCallback
    };
    window.dispatchEvent(new CustomEvent(EVENT_BUS_SUBSCRIBE_EVENT_NAME, { detail: event }));

    setTimeout(() => {
      const eventPublish: EventBusPublish = { topic: 'SIGN.MY_ID', detail: { data: 'my_data' } };
      window.dispatchEvent(new CustomEvent(EVENT_BUS_PUBLISH_EVENT_NAME, { detail: eventPublish }));
      setTimeout(() => {
        expect(myCallback).toHaveBeenCalledWith('SIGN.MY_ID', { data: 'my_data' });
        window.dispatchEvent(new CustomEvent(EVENT_BUS_UNSUBSCRIBE_EVENT_NAME, { detail: eventPublish }));
        setTimeout(() => {
          expect(unSubSpy).toHaveBeenCalled();
          myCallback.mockClear();
          window.dispatchEvent(new CustomEvent(EVENT_BUS_PUBLISH_EVENT_NAME, { detail: eventPublish }));
          setTimeout(() => {
            expect(myCallback).not.toHaveBeenCalled();
            done();
          }, 0);
        }, 0);
      }, 0);
    }, 0);
  });

  it('should enable the Debug mode of PubSub library', () => {
    eventBus.enableDebugMode(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((PubSub as any).immediateExceptions).toBeTruthy();
  });

  it('should set to false the Debug mode of PubSub library by default', () => {
    eventBus.enableDebugMode();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((PubSub as any).immediateExceptions).toBeFalsy();
  });

  describe('private events', () => {
    it('should trigger specific private event but not general when publishing to a private event', (done) => {
      expect.assertions(2);
      const myGeneralCallback = jest.fn();
      const myPrivateCallback = jest.fn();
      const generalEvent: EventBusSubscribe = {
        topic: 'SIGN.APP_SCOPE',
        callback: myGeneralCallback
      };
      window.dispatchEvent(new CustomEvent(EVENT_BUS_SUBSCRIBE_EVENT_NAME, { detail: generalEvent }));
      const privateEvent: EventBusSubscribe = {
        topic: 'SIGN.PRIVATE_SCOPE.APP_SCOPE',
        callback: myPrivateCallback
      };
      window.dispatchEvent(new CustomEvent(EVENT_BUS_SUBSCRIBE_EVENT_NAME, { detail: privateEvent }));

      setTimeout(() => {
        const eventPublish: EventBusPublish = {
          topic: 'SIGN',
          scope: 'PRIVATE_SCOPE.APP_SCOPE',
          detail: { data: 'my_data' }
        };
        window.dispatchEvent(new CustomEvent(EVENT_BUS_PUBLISH_EVENT_NAME, { detail: eventPublish }));
        setTimeout(() => {
          expect(myGeneralCallback).not.toHaveBeenCalled();
          expect(myPrivateCallback).toHaveBeenCalledWith('SIGN.PRIVATE_SCOPE.APP_SCOPE', { data: 'my_data' });
          done();
        }, 0);
      }, 0);
    });
  });
});
