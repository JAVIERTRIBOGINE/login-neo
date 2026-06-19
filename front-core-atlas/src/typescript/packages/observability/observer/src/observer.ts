import { LoggerUtils } from '@proteo/logger-utils';

/**
 * Configuration object for Observer subscription callbacks.
 *
 * @template T - The type of data that will be emitted by the observer
 */
export type ObserverParams<T> = {
  next: (data: T) => void;
  error?: (error: unknown) => void;
  complete?: () => void;
};

/**
 * Response object returned when subscribing to an Observer.
 * Contains an unsubscribe method if subscription was successful, empty object otherwise.
 */
export type ObserverResponse = { unsubscribe: () => void } | Record<string, never>;

/**
 * A lightweight implementation of the Observer pattern for reactive programming.
 * Allows multiple subscribers to listen for data emissions, errors, and completion events.
 *
 * @template T - The type of data that will be emitted to subscribers
 */
export class Observer<T = unknown> {
  /** Set of active subscribers */
  private subscribers: Set<ObserverParams<T>> = new Set();
  /** Flag indicating if the observer is closed */
  private _closed = false;

  /**
   * Gets whether the observer is closed.
   * When closed, no new subscriptions are allowed and no emissions occur.
   */
  get closed(): boolean {
    return this._closed;
  }

  /**
   * Subscribes to the observer with the provided callback functions.
   *
   * @param subscriberObj - The subscription configuration object containing callback functions
   * @returns An object with an unsubscribe method if successful, empty object if failed
   */
  subscribe(subscriberObj: ObserverParams<T>): ObserverResponse {
    if (this._closed) {
      LoggerUtils.getInstance().warn('[observer] subscribe: observer is closed');
      return {};
    }

    if (!subscriberObj || typeof subscriberObj !== 'object' || typeof subscriberObj.next !== 'function') {
      LoggerUtils.getInstance().error('[observer] subscribe: invalid subscriber');
      return {};
    }

    this.subscribers.add(subscriberObj);
    LoggerUtils.getInstance().debug(`[observer] Subscriber added. Total: ${this.subscribers.size}`);

    return {
      unsubscribe: () => this.unsubscribe(subscriberObj)
    };
  }

  /**
   * Emits data to all active subscribers.
   * If the observer is closed or has no subscribers, the emission is ignored.
   *
   * @param data - The data to emit to all subscribers
   */
  next(data: T): void {
    if (this._closed) {
      LoggerUtils.getInstance().debug('[observer] next: observer is closed');
      return;
    }

    if (this.subscribers.size === 0) {
      LoggerUtils.getInstance().debug('[observer] next: no subscribers to notify');
      return;
    }

    const snapshot = Array.from(this.subscribers);
    LoggerUtils.getInstance().debug(`[observer] Notifying ${snapshot.length} subscriber(s)`);

    for (const sub of snapshot) {
      try {
        sub.next(data);
      } catch (err) {
        LoggerUtils.getInstance().error('[observer] Error in next callback:', err);
      }
    }
  }

  /**
   * Emits an error to all active subscribers and optionally completes the observer.
   *
   * @param error - The error to emit to all subscribers
   * @param options - Configuration options for error handling
   * @param options.completeAfterError - Whether to complete the observer after emitting the error
   */
  error(error: unknown, options: { completeAfterError?: boolean } = {}): void {
    const { completeAfterError = false } = options;
    if (this._closed) return;

    const snapshot = Array.from(this.subscribers);
    for (const sub of snapshot) {
      try {
        sub.error?.(error);
      } catch (err) {
        LoggerUtils.getInstance().error('[observer] Error in error callback:', err);
      }
    }

    if (completeAfterError) this.complete();
  }

  /**
   * Completes the observer, notifying all subscribers and then closing it.
   * After completion, no further emissions or subscriptions are allowed.
   */
  complete(): void {
    if (this._closed) return;

    const snapshot = Array.from(this.subscribers);
    for (const sub of snapshot) {
      try {
        sub.complete?.();
      } catch (err) {
        LoggerUtils.getInstance().error('[observer] Error in complete callback:', err);
      }
    }

    this.subscribers.clear();
    this._closed = true;
    LoggerUtils.getInstance().debug('[observer] Completed and closed');
  }

  /**
   * Unsubscribes a specific subscriber from the observer.
   *
   * @param subscriberObj - The subscriber object to remove
   */
  unsubscribe(subscriberObj: ObserverParams<T>): void {
    if (!subscriberObj || typeof subscriberObj !== 'object') {
      LoggerUtils.getInstance().warn('[observer] unsubscribe: invalid subscriber');
      return;
    }

    this.subscribers.delete(subscriberObj);
    LoggerUtils.getInstance().debug(`[observer] Subscriber removed. Total: ${this.subscribers.size}`);
  }

  /**
   * Checks if a specific subscriber is currently subscribed to this observer.
   *
   * @param sub - The subscriber object to check for
   * @returns True if the subscriber is found, false otherwise
   */
  hasSubscriber(sub: ObserverParams<T>): boolean {
    return this.subscribers.has(sub);
  }

  /**
   * Returns a read-only array of all current subscribers.
   * Useful for debugging or inspection purposes.
   *
   * @returns A read-only array containing all subscriber objects
   */
  listSubscribers(): ReadonlyArray<ObserverParams<T>> {
    return Array.from(this.subscribers);
  }

  /**
   * Gets the current number of active subscribers.
   *
   * @returns The count of active subscribers
   */
  get subscriberCount(): number {
    return this.subscribers.size;
  }
}
