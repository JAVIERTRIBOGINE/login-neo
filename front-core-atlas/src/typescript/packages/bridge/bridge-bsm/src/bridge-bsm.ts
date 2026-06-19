import { Bridge } from '@proteo/bridge';
import { LoggerUtils } from '@proteo/logger-utils';
import type { BridgeRequest, NativeEvent } from '@proteo/types';

export abstract class BridgeBSM extends Bridge {
  protected static LOGGER_PREFIX = '[BridgeBSM]';

  /**
   * Set the eventListener to manage the Native Response and execute the callbackId
   */
  setNativeBridgeEventListener(): void {
    if (!this.isEventSetted) {
      this.isEventSetted = true;
      this.onBridgeEvent = this.onBridgeEvent.bind(this);
      window.addEventListener('BSMBridge', this.onBridgeEvent);
    }
  }

  protected onBridgeEvent(event: unknown): void {
    const { LOGGER_PREFIX } = this.constructor as typeof BridgeBSM;
    try {
      // FIXME:
      // Natives event responses send a non standard event. Sends the response into a data object instead of a Custom event detail
      // For support the current code, Proteo4 arch adds an or check to support iOS BSM, Android BSM and web Custom event
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (event as NativeEvent).data || (event as CustomEvent).detail;
      if (data) {
        LoggerUtils.getInstance().debug(`${LOGGER_PREFIX} - event received - data:`, data);
        const messageData = JSON.parse(data);

        let decodedJSON = null;
        const args = [];
        if (messageData.response !== undefined) {
          decodedJSON = this.decodeJSONResponse(LOGGER_PREFIX, messageData.response);
          args.push(decodedJSON);
        }
        LoggerUtils.getInstance().debug(`${LOGGER_PREFIX} - event received - decoded data:`, decodedJSON);
        const cb = this.bridgeGetCallback(messageData.callbackId);
        cb(...args);
      } else {
        LoggerUtils.getInstance().error(`${LOGGER_PREFIX} - Data response malformed`);
      }
    } catch {
      LoggerUtils.getInstance().error(`${LOGGER_PREFIX} - ERROR executing the callback`);
    }
  }

  private decodeJSONResponse(LOGGER_PREFIX: string, message: string): BridgeRequest | undefined {
    const decoded = decodeURIComponent(message.replace(/\+/g, ' '));
    const decodedJSON = JSON.parse(decoded);
    if (decodedJSON.response && typeof decodedJSON.response === 'string') {
      try {
        decodedJSON.response = JSON.parse(decodedJSON.response);
      } catch {
        LoggerUtils.getInstance().debug(`${LOGGER_PREFIX} - failed to JSON parse decodedJSON.response`);
      }
      // Changes needed for userInfo response
      // Next line deprecated in favour of the prior if > else
      // TODO: remove changes and reimplement this line when userInfo response comes in data object
      // decodedJSON.response = typeof decodedJSON.response === 'string' ? JSON.parse(decodedJSON.response) : decodedJSON.response;
    }
    return decodedJSON;
  }

  destroy(): void {
    if (this.isEventSetted) {
      window.removeEventListener('BSMBridge', this.onBridgeEvent);
    }
  }
}
