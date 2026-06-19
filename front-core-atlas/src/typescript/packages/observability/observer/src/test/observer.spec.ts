import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockDebug = jest.fn();
const mockInfo = jest.fn();
const mockWarn = jest.fn();
const mockError = jest.fn();

await jest.unstable_mockModule('@proteo/logger-utils', () => ({
  LoggerUtils: {
    getInstance: () => ({
      debug: mockDebug,
      info: mockInfo,
      warn: mockWarn,
      error: mockError
    })
  }
}));

const { Observer } = await import('../observer.js');

describe('Observer', () => {
  let observer: InstanceType<typeof Observer<string>>;

  beforeEach(() => {
    observer = new Observer<string>();
    jest.clearAllMocks();
  });

  describe('constructor and initial state', () => {
    it('should initialize with no subscribers and open state', () => {
      expect(observer.subscriberCount).toBe(0);
      expect(observer.closed).toBe(false);
      expect(observer.listSubscribers()).toEqual([]);
    });
  });

  describe('subscribe', () => {
    it('should add a subscriber and return an unsubscribe function', () => {
      const subscriber = { next: jest.fn() };
      const result = observer.subscribe(subscriber);

      expect(observer.subscriberCount).toBe(1);
      expect(result).toHaveProperty('unsubscribe');
      expect(typeof result.unsubscribe).toBe('function');
    });

    it('should allow multiple subscribers', () => {
      const subscriber1 = { next: jest.fn() };
      const subscriber2 = { next: jest.fn() };

      observer.subscribe(subscriber1);
      observer.subscribe(subscriber2);

      expect(observer.subscriberCount).toBe(2);
    });

    it('should return unsubscribe function that removes the subscriber', () => {
      const subscriber = { next: jest.fn() };
      const result = observer.subscribe(subscriber);

      if ('unsubscribe' in result) {
        result.unsubscribe();
        expect(observer.subscriberCount).toBe(0);
      }
    });

    it('should log debug message when subscriber is added', () => {
      const subscriber = { next: jest.fn() };
      observer.subscribe(subscriber);

      expect(mockDebug).toHaveBeenCalledWith('[observer] Subscriber added. Total: 1');
    });

    it('should return empty object and log warning when observer is closed', () => {
      observer.complete();
      const subscriber = { next: jest.fn() };
      const result = observer.subscribe(subscriber);

      expect(result).toEqual({});
      expect(mockWarn).toHaveBeenCalledWith('[observer] subscribe: observer is closed');
      expect(observer.subscriberCount).toBe(0);
    });

    it('should return empty object and log error when invalid subscriber is provided', () => {
      const subscribeWithInvalidArgument = (invalidArg: unknown) => observer.subscribe(invalidArg as Parameters<typeof observer.subscribe>[0]);
      const result1 = subscribeWithInvalidArgument(null);
      const result2 = subscribeWithInvalidArgument(undefined);
      const result3 = subscribeWithInvalidArgument('not an object');
      const result4 = subscribeWithInvalidArgument({});

      expect(result1).toEqual({});
      expect(result2).toEqual({});
      expect(result3).toEqual({});
      expect(result4).toEqual({});
      expect(mockError).toHaveBeenCalledWith('[observer] subscribe: invalid subscriber');
      expect(observer.subscriberCount).toBe(0);
    });

    it('should accept subscribers with optional error and complete callbacks', () => {
      const fullSubscriber = {
        next: jest.fn(),
        error: jest.fn(),
        complete: jest.fn()
      };
      const minimalSubscriber = { next: jest.fn() };

      observer.subscribe(fullSubscriber);
      observer.subscribe(minimalSubscriber);

      expect(observer.subscriberCount).toBe(2);
    });
  });

  describe('unsubscribe', () => {
    it('should remove a specific subscriber', () => {
      const subscriber1 = { next: jest.fn() };
      const subscriber2 = { next: jest.fn() };

      observer.subscribe(subscriber1);
      observer.subscribe(subscriber2);

      observer.unsubscribe(subscriber1);

      expect(observer.subscriberCount).toBe(1);
      expect(observer.hasSubscriber(subscriber1)).toBe(false);
      expect(observer.hasSubscriber(subscriber2)).toBe(true);
    });

    it('should not fail when trying to unsubscribe a non-existent subscriber', () => {
      const subscriber = { next: jest.fn() };

      expect(() => observer.unsubscribe(subscriber)).not.toThrow();
      expect(observer.subscriberCount).toBe(0);
    });

    it('should log debug message when subscriber is removed', () => {
      const subscriber = { next: jest.fn() };
      observer.subscribe(subscriber);

      observer.unsubscribe(subscriber);

      expect(mockDebug).toHaveBeenCalledWith('[observer] Subscriber removed. Total: 0');
    });

    it('should log warning when invalid subscriber object is provided', () => {
      const unsubscribeWithInvalidArgument = (invalidArg: unknown) => observer.unsubscribe(invalidArg as Parameters<typeof observer.unsubscribe>[0]);
      unsubscribeWithInvalidArgument(null);
      unsubscribeWithInvalidArgument('not an object');

      expect(mockWarn).toHaveBeenCalledWith('[observer] unsubscribe: invalid subscriber');
    });
  });

  describe('next', () => {
    it('should notify all subscribers with the provided data', () => {
      const subscriber1 = { next: jest.fn() };
      const subscriber2 = { next: jest.fn() };
      const testData = 'test data';

      observer.subscribe(subscriber1);
      observer.subscribe(subscriber2);

      observer.next(testData);

      expect(subscriber1.next).toHaveBeenCalledWith(testData);
      expect(subscriber2.next).toHaveBeenCalledWith(testData);
      expect(subscriber1.next).toHaveBeenCalledTimes(1);
      expect(subscriber2.next).toHaveBeenCalledTimes(1);
    });

    it('should not call unsubscribed subscribers', () => {
      const subscriber1 = { next: jest.fn() };
      const subscriber2 = { next: jest.fn() };
      const testData = 'test data';

      observer.subscribe(subscriber1);
      const result = observer.subscribe(subscriber2);

      if ('unsubscribe' in result) {
        result.unsubscribe();
      }
      observer.next(testData);

      expect(subscriber1.next).toHaveBeenCalledWith(testData);
      expect(subscriber2.next).not.toHaveBeenCalled();
    });

    it('should log debug message when notifying subscribers', () => {
      const subscriber1 = { next: jest.fn() };
      const subscriber2 = { next: jest.fn() };
      observer.subscribe(subscriber1);
      observer.subscribe(subscriber2);

      observer.next('test data');

      expect(mockDebug).toHaveBeenCalledWith('[observer] Notifying 2 subscriber(s)');
    });

    it('should log debug message when no subscribers to notify', () => {
      observer.next('test data');

      expect(mockDebug).toHaveBeenCalledWith('[observer] next: no subscribers to notify');
    });

    it('should not emit when observer is closed', () => {
      const subscriber = { next: jest.fn() };
      observer.subscribe(subscriber);
      observer.complete();

      observer.next('test data');

      expect(subscriber.next).not.toHaveBeenCalled();
      expect(mockDebug).toHaveBeenCalledWith('[observer] next: observer is closed');
    });

    it('should catch and log errors thrown by subscriber callbacks', () => {
      const errorSubscriber = {
        next: jest.fn().mockImplementation(() => {
          throw new Error('Subscriber callback error');
        })
      };
      const normalSubscriber = { next: jest.fn() };

      observer.subscribe(errorSubscriber);
      observer.subscribe(normalSubscriber);

      observer.next('test data');

      expect(mockError).toHaveBeenCalledWith('[observer] Error in next callback:', expect.any(Error));
      expect(normalSubscriber.next).toHaveBeenCalledWith('test data');
    });
  });

  describe('error', () => {
    it('should notify all subscribers with error callbacks', () => {
      const subscriber1 = { next: jest.fn(), error: jest.fn() };
      const subscriber2 = { next: jest.fn(), error: jest.fn() };
      const testError = new Error('Test error');

      observer.subscribe(subscriber1);
      observer.subscribe(subscriber2);

      observer.error(testError);

      expect(subscriber1.error).toHaveBeenCalledWith(testError);
      expect(subscriber2.error).toHaveBeenCalledWith(testError);
      expect(subscriber1.next).not.toHaveBeenCalled();
      expect(subscriber2.next).not.toHaveBeenCalled();
    });

    it('should not call error on subscribers without error callback', () => {
      const subscriber = { next: jest.fn() };
      const testError = new Error('Test error');

      observer.subscribe(subscriber);
      observer.error(testError);

      expect(subscriber.next).not.toHaveBeenCalled();
    });

    it('should not emit error when observer is closed', () => {
      const subscriber = { next: jest.fn(), error: jest.fn() };
      observer.subscribe(subscriber);
      observer.complete();

      observer.error(new Error('Test error'));

      expect(subscriber.error).not.toHaveBeenCalled();
    });

    it('should complete observer after error when completeAfterError is true', () => {
      const subscriber = { next: jest.fn(), error: jest.fn() };
      observer.subscribe(subscriber);

      observer.error(new Error('Test error'), { completeAfterError: true });

      expect(observer.closed).toBe(true);
      expect(observer.subscriberCount).toBe(0);
    });

    it('should catch and log errors thrown by error callbacks', () => {
      const errorSubscriber = {
        next: jest.fn(),
        error: jest.fn().mockImplementation(() => {
          throw new Error('Error callback error');
        })
      };
      const normalSubscriber = { next: jest.fn(), error: jest.fn() };

      observer.subscribe(errorSubscriber);
      observer.subscribe(normalSubscriber);

      const testError = new Error('Original error');
      observer.error(testError);

      expect(mockError).toHaveBeenCalledWith('[observer] Error in error callback:', expect.any(Error));
      expect(normalSubscriber.error).toHaveBeenCalledWith(testError);
    });
  });

  describe('complete', () => {
    it('should notify all subscribers with complete callbacks and close observer', () => {
      const subscriber1 = { next: jest.fn(), complete: jest.fn() };
      const subscriber2 = { next: jest.fn(), complete: jest.fn() };

      observer.subscribe(subscriber1);
      observer.subscribe(subscriber2);

      observer.complete();

      expect(subscriber1.complete).toHaveBeenCalledWith();
      expect(subscriber2.complete).toHaveBeenCalledWith();
      expect(observer.closed).toBe(true);
      expect(observer.subscriberCount).toBe(0);
    });

    it('should not call complete on subscribers without complete callback', () => {
      const subscriber = { next: jest.fn() };
      observer.subscribe(subscriber);

      observer.complete();

      expect(subscriber.next).not.toHaveBeenCalled();
      expect(observer.closed).toBe(true);
    });

    it('should not complete if already closed', () => {
      const subscriber = { next: jest.fn(), complete: jest.fn() };
      observer.subscribe(subscriber);
      observer.complete();

      jest.clearAllMocks();
      observer.complete();

      expect(subscriber.complete).not.toHaveBeenCalled();
    });

    it('should log debug message when completed and closed', () => {
      observer.complete();

      expect(mockDebug).toHaveBeenCalledWith('[observer] Completed and closed');
    });

    it('should catch and log errors thrown by complete callbacks', () => {
      const errorSubscriber = {
        next: jest.fn(),
        complete: jest.fn().mockImplementation(() => {
          throw new Error('Complete callback error');
        })
      };
      const normalSubscriber = { next: jest.fn(), complete: jest.fn() };

      observer.subscribe(errorSubscriber);
      observer.subscribe(normalSubscriber);

      observer.complete();

      expect(mockError).toHaveBeenCalledWith('[observer] Error in complete callback:', expect.any(Error));
      expect(normalSubscriber.complete).toHaveBeenCalledWith();
    });
  });

  describe('subscriberCount', () => {
    it('should return 0 for a new observer', () => {
      expect(observer.subscriberCount).toBe(0);
    });

    it('should return the correct count after adding subscribers', () => {
      observer.subscribe({ next: jest.fn() });
      observer.subscribe({ next: jest.fn() });
      observer.subscribe({ next: jest.fn() });

      expect(observer.subscriberCount).toBe(3);
    });

    it('should return the correct count after removing subscribers', () => {
      const result = observer.subscribe({ next: jest.fn() });
      observer.subscribe({ next: jest.fn() });

      if ('unsubscribe' in result) {
        result.unsubscribe();
      }

      expect(observer.subscriberCount).toBe(1);
    });
  });

  describe('hasSubscriber', () => {
    it('should return true for a subscribed subscriber', () => {
      const subscriber = { next: jest.fn() };
      observer.subscribe(subscriber);

      expect(observer.hasSubscriber(subscriber)).toBe(true);
    });

    it('should return false for a non-subscribed subscriber', () => {
      const subscriber1 = { next: jest.fn() };
      const subscriber2 = { next: jest.fn() };

      observer.subscribe(subscriber1);

      expect(observer.hasSubscriber(subscriber2)).toBe(false);
    });

    it('should return false after unsubscribing a subscriber', () => {
      const subscriber = { next: jest.fn() };
      const result = observer.subscribe(subscriber);

      expect(observer.hasSubscriber(subscriber)).toBe(true);

      if ('unsubscribe' in result) {
        result.unsubscribe();
      }

      expect(observer.hasSubscriber(subscriber)).toBe(false);
    });

    it('should return false after completing observer', () => {
      const subscriber1 = { next: jest.fn() };
      const subscriber2 = { next: jest.fn() };

      observer.subscribe(subscriber1);
      observer.subscribe(subscriber2);

      expect(observer.hasSubscriber(subscriber1)).toBe(true);
      expect(observer.hasSubscriber(subscriber2)).toBe(true);

      observer.complete();

      expect(observer.hasSubscriber(subscriber1)).toBe(false);
      expect(observer.hasSubscriber(subscriber2)).toBe(false);
    });
  });

  describe('listSubscribers', () => {
    it('should return an empty array for a new observer', () => {
      const subscribers = observer.listSubscribers();

      expect(subscribers).toEqual([]);
      expect(subscribers).toHaveLength(0);
    });

    it('should return an array with all subscribed subscribers', () => {
      const subscriber1 = { next: jest.fn() };
      const subscriber2 = { next: jest.fn() };
      const subscriber3 = { next: jest.fn() };

      observer.subscribe(subscriber1);
      observer.subscribe(subscriber2);
      observer.subscribe(subscriber3);

      const subscribers = observer.listSubscribers();

      expect(subscribers).toHaveLength(3);
      expect(subscribers).toContain(subscriber1);
      expect(subscribers).toContain(subscriber2);
      expect(subscribers).toContain(subscriber3);
    });

    it('should return a copy of the subscribers array', () => {
      const subscriber = { next: jest.fn() };
      observer.subscribe(subscriber);

      const subscribers1 = observer.listSubscribers();
      const subscribers2 = observer.listSubscribers();

      expect(subscribers1).not.toBe(subscribers2);
      expect(subscribers1).toEqual(subscribers2);
    });

    it('should return a readonly array that cannot be modified', () => {
      const subscriber1 = { next: jest.fn() };
      const subscriber2 = { next: jest.fn() };

      observer.subscribe(subscriber1);
      observer.subscribe(subscriber2);

      expect(observer.subscriberCount).toBe(2);
      expect(observer.listSubscribers()).toHaveLength(2);
    });

    it('should reflect changes after unsubscribing', () => {
      const subscriber1 = { next: jest.fn() };
      const subscriber2 = { next: jest.fn() };

      observer.subscribe(subscriber1);
      const result = observer.subscribe(subscriber2);

      let subscribers = observer.listSubscribers();
      expect(subscribers).toHaveLength(2);

      if ('unsubscribe' in result) {
        result.unsubscribe();
      }

      subscribers = observer.listSubscribers();
      expect(subscribers).toHaveLength(1);
      expect(subscribers).toContain(subscriber1);
      expect(subscribers).not.toContain(subscriber2);
    });

    it('should return an empty array after completing observer', () => {
      const subscriber1 = { next: jest.fn() };
      const subscriber2 = { next: jest.fn() };

      observer.subscribe(subscriber1);
      observer.subscribe(subscriber2);

      expect(observer.listSubscribers()).toHaveLength(2);

      observer.complete();

      expect(observer.listSubscribers()).toEqual([]);
      expect(observer.listSubscribers()).toHaveLength(0);
    });
  });

  describe('closed property', () => {
    it('should return false for a new observer', () => {
      expect(observer.closed).toBe(false);
    });

    it('should return true after completing', () => {
      observer.complete();
      expect(observer.closed).toBe(true);
    });

    it('should remain true after multiple complete calls', () => {
      observer.complete();
      observer.complete();
      expect(observer.closed).toBe(true);
    });
  });
});
