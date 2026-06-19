import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { EventManager } from '@proteo/event-bus';
import { ErrorManager, sendError } from '../error-management-utils.js';
import type { ErrorManagementPayload } from '../types/index.js';

describe('ErrorManagement', () => {
  const mockPayload: ErrorManagementPayload = {
    errorMessage: 'Z23228: Los datos introducidos no son correctos',
    code: 'Z23228',
    errorMessageTitle: 'Los datos introducidos no son correctos',
    errorMessageDetail: 'Tienes 5 intentos de inicio de sesión. Inténtalo de nuevo o recupera tu contraseña si no la recuerdas.',
    errorCode: 'Z23228',
    severity: 'ERROR',
    labelCta: '',
    operationCta: '',
    clickToCall: '0',
    nombreOperativa: 'ZZZ',
    idCanal: 'INT'
  };

  const mockPayloadArray: ErrorManagementPayload[] = [mockPayload];

  beforeEach(() => {
    const isClosed = 'closed' in ErrorManager.errors$ ? ErrorManager.errors$.closed : false;
    if (!isClosed) {
      const subscribers = ErrorManager.errors$.listSubscribers();
      subscribers.forEach((subscriber) => {
        ErrorManager.errors$.unsubscribe(subscriber);
      });
    }
  });

  const skipIfClosed = () => {
    const isClosed = 'closed' in ErrorManager.errors$ ? ErrorManager.errors$.closed : false;
    if (isClosed) {
      throw new Error('Observer is closed - this test should run before completion tests');
    }
  };

  describe('ErrorManager class', () => {
    describe('static errors property', () => {
      it('should have a static errors Observer instance', () => {
        expect.assertions(4);
        expect(ErrorManager.errors$).toBeDefined();
        expect(typeof ErrorManager.errors$.subscribe).toBe('function');
        expect(typeof ErrorManager.errors$.next).toBe('function');
        expect(typeof ErrorManager.errors$.subscriberCount).toBe('number');
      });

      it('should be the same instance across multiple accesses (singleton behavior)', () => {
        expect.assertions(1);
        const firstAccess = ErrorManager.errors$;
        const secondAccess = ErrorManager.errors$;

        expect(firstAccess).toBe(secondAccess);
      });
    });

    describe('Observer integration', () => {
      it('should allow subscribing to error events', () => {
        expect.assertions(2);
        skipIfClosed();

        const errorHandler = jest.fn();
        const subscriber = { next: errorHandler };

        const result = ErrorManager.errors$.subscribe(subscriber);

        expect(ErrorManager.errors$.subscriberCount).toBeGreaterThan(0);

        const isFunction = typeof result === 'function';
        const hasUnsubscribe = typeof result === 'object' && result !== null && 'unsubscribe' in result;
        expect(isFunction || hasUnsubscribe).toBe(true);
      });

      it('should notify subscribers when error is emitted', () => {
        expect.assertions(4);
        skipIfClosed();

        const errorHandler1 = jest.fn();
        const errorHandler2 = jest.fn();

        ErrorManager.errors$.subscribe({ next: errorHandler1 });
        ErrorManager.errors$.subscribe({ next: errorHandler2 });

        ErrorManager.errors$.next(mockPayload);

        expect(errorHandler1).toHaveBeenCalledWith(mockPayload);
        expect(errorHandler2).toHaveBeenCalledWith(mockPayload);
        expect(errorHandler1).toHaveBeenCalledTimes(1);
        expect(errorHandler2).toHaveBeenCalledTimes(1);
      });

      it('should allow multiple error emissions', () => {
        expect.assertions(3);
        skipIfClosed();

        const errorHandler = jest.fn();
        ErrorManager.errors$.subscribe({ next: errorHandler });

        const error1 = { ...mockPayload, errorCode: 'E001' };
        const error2 = { ...mockPayload, errorCode: 'E002' };

        ErrorManager.errors$.next(error1);
        ErrorManager.errors$.next(error2);

        expect(errorHandler).toHaveBeenCalledTimes(2);
        expect(errorHandler).toHaveBeenNthCalledWith(1, error1);
        expect(errorHandler).toHaveBeenNthCalledWith(2, error2);
      });

      it('should allow unsubscribing from error events', () => {
        expect.assertions(3);
        skipIfClosed();

        const errorHandler = jest.fn();
        const initialCount = ErrorManager.errors$.subscriberCount;
        const result = ErrorManager.errors$.subscribe({ next: errorHandler });

        expect(ErrorManager.errors$.subscriberCount).toBe(initialCount + 1);

        if (typeof result === 'function') {
          (result as () => void)();
        } else if (typeof result === 'object' && result !== null && 'unsubscribe' in result) {
          const subscription = result as { unsubscribe: () => void };
          subscription.unsubscribe();
        }

        expect(ErrorManager.errors$.subscriberCount).toBe(initialCount);

        ErrorManager.errors$.next(mockPayload);
        expect(errorHandler).not.toHaveBeenCalled();
      });

      it('should support error callbacks without completing', () => {
        expect.assertions(2);
        skipIfClosed();

        const nextHandler = jest.fn();
        const errorHandler = jest.fn();

        ErrorManager.errors$.subscribe({
          next: nextHandler,
          error: errorHandler
        });

        ErrorManager.errors$.next(mockPayload);
        expect(nextHandler).toHaveBeenCalledWith(mockPayload);

        const testError = new Error('Test error');
        ErrorManager.errors$.error(testError);
        expect(errorHandler).toHaveBeenCalledWith(testError);
      });

      it('should handle different error payload types', () => {
        expect.assertions(3);
        skipIfClosed();

        const errorHandler = jest.fn();
        ErrorManager.errors$.subscribe({ next: errorHandler });

        const criticalError: ErrorManagementPayload = {
          ...mockPayload,
          severity: 'CRITICAL',
          errorMessageTitle: 'Critical System Error'
        };

        const warningError: ErrorManagementPayload = {
          ...mockPayload,
          severity: 'WARNING',
          errorMessageTitle: 'Warning Message'
        };

        ErrorManager.errors$.next(criticalError);
        ErrorManager.errors$.next(warningError);

        expect(errorHandler).toHaveBeenCalledTimes(2);
        expect(errorHandler).toHaveBeenCalledWith(criticalError);
        expect(errorHandler).toHaveBeenCalledWith(warningError);
      });
    });
  });

  describe('sendError function (legacy)', () => {
    let eventManagerSpy: jest.Mock;

    beforeEach(() => {
      eventManagerSpy = jest.fn();
      const mockEventManager = {
        getInstance: jest.fn().mockReturnValue({
          publish: eventManagerSpy
        })
      };
      Object.defineProperty(EventManager, 'getInstance', {
        value: mockEventManager.getInstance
      });
    });

    it('should call EventManager.publish when sendError is called', () => {
      expect.assertions(2);
      sendError(mockPayloadArray);

      expect(eventManagerSpy).toHaveBeenCalledTimes(1);
      expect(eventManagerSpy).toHaveBeenCalledWith('ERROR_MANAGEMENT', mockPayloadArray);
    });

    it('should work with empty array', () => {
      expect.assertions(2);
      sendError([]);

      expect(eventManagerSpy).toHaveBeenCalledTimes(1);
      expect(eventManagerSpy).toHaveBeenCalledWith('ERROR_MANAGEMENT', []);
    });

    it('should work with multiple error payloads', () => {
      expect.assertions(2);
      const multiplePayloads = [mockPayload, { ...mockPayload, errorCode: 'E002', severity: 'WARNING' as const }];

      sendError(multiplePayloads);

      expect(eventManagerSpy).toHaveBeenCalledTimes(1);
      expect(eventManagerSpy).toHaveBeenCalledWith('ERROR_MANAGEMENT', multiplePayloads);
    });

    it('should push errors into observer', () => {
      expect.assertions(1);
      const multiplePayloads = [mockPayload, { ...mockPayload, errorCode: 'E002', severity: 'WARNING' as const }];
      const errorHandler = jest.fn();
      const subscriber = { next: errorHandler };

      ErrorManager.errors$.subscribe(subscriber);
      sendError(multiplePayloads);

      expect(errorHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('Integration scenarios', () => {
    it('should allow using both Observer pattern and legacy function simultaneously', () => {
      expect.assertions(2);
      skipIfClosed();

      const observerHandler = jest.fn();
      const eventManagerSpy = jest.fn();

      ErrorManager.errors$.subscribe({ next: observerHandler });

      Object.defineProperty(EventManager, 'getInstance', {
        value: jest.fn().mockReturnValue({ publish: eventManagerSpy })
      });

      ErrorManager.errors$.next(mockPayload);

      sendError(mockPayloadArray);

      expect(observerHandler).toHaveBeenCalledWith(mockPayload);
      expect(eventManagerSpy).toHaveBeenCalledWith('ERROR_MANAGEMENT', mockPayloadArray);
    });

    it('should maintain independent state between Observer and EventManager', () => {
      expect.assertions(2);
      const observerHandler = jest.fn();
      const eventManagerSpy = jest.fn();

      ErrorManager.errors$.subscribe({ next: observerHandler });
      Object.defineProperty(EventManager, 'getInstance', {
        value: jest.fn().mockReturnValue({ publish: eventManagerSpy })
      });

      ErrorManager.errors$.complete();

      sendError(mockPayloadArray);

      const isClosed = 'closed' in ErrorManager.errors$ ? ErrorManager.errors$.closed : true;
      expect(isClosed).toBe(true);
      expect(eventManagerSpy).toHaveBeenCalledWith('ERROR_MANAGEMENT', mockPayloadArray);
    });
  });

  describe('Observer completion scenarios', () => {
    it('should handle completion behavior appropriately', () => {
      expect.assertions(3);
      const observer = ErrorManager.errors$ as unknown as { closed?: boolean };

      expect(observer.closed).toBe(true);
      expect(ErrorManager.errors$.subscriberCount).toBe(0);

      const result = ErrorManager.errors$.subscribe({ next: jest.fn() });
      expect(result).toEqual({});
    });
  });
});
