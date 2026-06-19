import { EventManager } from '@proteo/event-bus';
import { Observer } from '@proteo/observer';
import type { ErrorManagementPayload } from './types/index.js';

/**
 * Error management class that provides both event-based and observer-based error handling.
 * Integrates the Observer pattern for reactive error management.
 */
export class ErrorManager {
  /**
   * Static Observer instance for reactive error management.
   * Provides a singleton Observer that can be subscribed to for receiving error events.
   *
   * @static
   * @type {Observer<ErrorManagementPayload>}
   */
  static readonly errors$: Observer<ErrorManagementPayload> = new Observer<ErrorManagementPayload>();
}

/**
 * Legacy function maintained for backward compatibility.
 * Emits event for global error management using the traditional event system.
 *
 * @param payload - Array of normalized error payloads to be published
 * @deprecated Use ErrorManagement.errors.next() instead for better type safety and observer pattern benefits
 */
export const sendError = (payload: ErrorManagementPayload[]): void => {
  EventManager.getInstance().publish('ERROR_MANAGEMENT', payload);
  payload.forEach((error: ErrorManagementPayload) => ErrorManager.errors$.next(error));
};
