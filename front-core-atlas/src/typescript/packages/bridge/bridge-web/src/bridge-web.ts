import { Bridge } from '@proteo/bridge';
import { LoggerUtils } from '@proteo/logger-utils';
import type { WebBridgeRequest } from '@proteo/types';

/**
 * Specific implementation for Web platform when embedded by an iframe
 *
 * It creates a post message bridge between Proteo4 and its parent iframe
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
 */
export class BridgeWeb extends Bridge {
  constructor(actions?: string[], actionsBroadcast?: string[]) {
    super(actions, actionsBroadcast);
  }

  protected static LOGGER_PREFIX = '[BridgeWeb]';

  /**
   * Handles the native bridge event
   * @param {MessageEvent} event the native bridge event
   */
  onBridgeEvent(event: MessageEvent): void {
    if (event.data && event.data.callbackId && event.data.response) {
      // Response from native bridge
      const cb = this.bridgeGetCallback(event.data.callbackId);
      cb(event.data.response);
    } else if (event.data && event.data.operation && event.data.response) {
      // Message from native bridge
      this.dispatchResponseEvent(event.data.operation, event.data.response);
    } else {
      if (event.data && event.data.callbackId) {
        LoggerUtils.getInstance().warn(
          `${(this.constructor as typeof BridgeWeb).LOGGER_PREFIX} - Data response malformed`,
          event.data
        );
      }
    }
  }

  /**
   * Sets the listener to manage parent Iframes Responses
   */
  setNativeBridgeEventListener(): void {
    if (!this.isEventSetted) {
      this.isEventSetted = true;
      this.onBridgeEvent = this.onBridgeEvent.bind(this);
      window.addEventListener('message', this.onBridgeEvent);
    }
  }

  destroy(): void {
    if (this.isEventSetted) {
      window.removeEventListener('message', this.onBridgeEvent);
    }
  }
  /**
   * Sends the message to the parent iframe
   * @param operation the operation to be executed in the parent
   * @param callbackId a callback identifier for asynchronous events
   * @param data the operation payload
   */
  nativeOperation(operation: string, callbackId: string, data: unknown): void {
    LoggerUtils.getInstance().debug(
      `${(this.constructor as typeof BridgeWeb).LOGGER_PREFIX} - `,
      operation,
      callbackId,
      data
    );
    const msg = {
      operation,
      callbackId,
      data
    } as WebBridgeRequest;
    window.parent.postMessage(msg, '*');
  }
}
