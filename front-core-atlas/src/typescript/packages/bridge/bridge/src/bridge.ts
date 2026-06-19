import { EVENT_BUS_PUBLISH_EVENT_NAME, EVENT_BUS_SUBSCRIBE_EVENT_NAME, EventManager } from '@proteo/event-bus';
import { LoggerUtils } from '@proteo/logger-utils';
import {
  EVENT_BRIDGE_BROADCAST,
  type BridgeRequest,
  type EventBusPublish,
  type EventBusSubscribe,
  type NativeCallback
} from '@proteo/types';

/**
 * Bridge is an abstract class that must be implement every platform that needs support a native interaction
 *
 * All the code is implemented by the Bridge abstract that because it is commons for every platform.
 * Only the native operation must be implemented for every platform
 */
export abstract class Bridge {
  /**
   * A Map with the callback stack saved to launch on every response from Native executions
   */
  protected mapCalls: Map<string, NativeCallback> = new Map();

  /**
   * Flag to save the status of the native event handler setting
   */
  protected isEventSetted = false;

  constructor(actions?: string[], actionsBroadcast?: string[]) {
    this.setNativeBridgeEventListener();
    this.subscribeTopics(actions);
    this.subscribeBridgeBroadcast(actionsBroadcast);
  }

  /**
   * Save a callback into the global map for future execution
   * @param callback Callback to execute after the native response
   */
  protected bridgeSaveCallback(callback: NativeCallback): string {
    const uid = new Date().getTime().toString();
    if (!this.mapCalls.has(uid)) {
      this.mapCalls.set(uid, callback);
      return uid;
    } else {
      // save guard for saving two callbacks on the same millisecond
      return this.bridgeSaveCallback(callback);
    }
  }

  /**
   * Retrieve the specific callback for executing the response from a callback id
   * @param callbackId ID of the callback to search into the map
   */
  protected bridgeGetCallback(callbackId: string): NativeCallback {
    const callback = this.mapCalls.get(callbackId);
    if (callback != null) {
      this.mapCalls.delete(callbackId);
      return callback;
    } else {
      return () => {
        throw new Error(`ERROR retrieving the callback from the map for callback id: ${callbackId}`);
      };
    }
  }

  /**
   * The function register a response callback to manage when the native context responds and
   * call to the native operation
   * @param msg: The topic sended by the publisher
   * @param request: The request object to initialize the native response
   */
  protected nativeHandler(msg: string, request: BridgeRequest): void {
    const topicArr = msg.split('.');
    const topicOperation = topicArr.shift();
    let callbackId = '';
    if (topicOperation) {
      callbackId = this.bridgeSaveCallback((data: unknown) => {
        const extractSubTopic = msg.replace(topicOperation, `${topicOperation}_RESPONSE`);
        this.dispatchResponseEvent(extractSubTopic, data);
      });
    }
    this.nativeOperation(request.method, callbackId, request.data);
  }

  /**
   * Send the response event when the native context responds
   * @param topic: The topic that will be published
   * @param data: The data to send to the subscriber
   */
  protected dispatchResponseEvent(topic: string, data: unknown): void {
    const event: EventBusPublish = { topic, detail: data };
    window.dispatchEvent(new CustomEvent(EVENT_BUS_PUBLISH_EVENT_NAME, { detail: event }));
  }

  /**
   * The function retrieves from window object a list of topics to subscribe for the Bridge.
   */
  protected subscribeTopics(actions: string[] = []): void {
    LoggerUtils.getInstance().debug('[BridgeBase.subscribeTopics] subscribing to ', actions, {
      remoteLogger: true,
      type: 'application'
    });
    actions.forEach((topic) => {
      const event: EventBusSubscribe<BridgeRequest> = { topic, callback: this.nativeHandler.bind(this) };
      window.dispatchEvent(new CustomEvent(EVENT_BUS_SUBSCRIBE_EVENT_NAME, { detail: event }));
    });
  }

  /**
   * The function listens to the window object for a list of topics to subscribe for the Bridge.
   * When the event is received, the function will call the native handler to execute the operation
   * @param actionsBroadcast: The list of topics to listen to
   * @returns void
   */
  protected subscribeBridgeBroadcast(actionsBroadcast: string[] = []): void {
    LoggerUtils.getInstance().debug('[BridgeBase.subscribeTopicsReceived] listen to', actionsBroadcast, {
      remoteLogger: true,
      type: 'application'
    });
    if (actionsBroadcast && actionsBroadcast.length) {
      window.addEventListener(EVENT_BRIDGE_BROADCAST, (event: Event) => {
        const data = event as CustomEvent<{ event: string; data: unknown }>;
        if (actionsBroadcast.includes(data.detail.event)) {
          LoggerUtils.getInstance().debug('[BridgeBase.subscribeTopicsReceived] send event', data.detail.event, {
            remoteLogger: true,
            type: 'application'
          });
          EventManager.getInstance().publish(data.detail.event, data.detail.data);
        }
      });
    }
  }

  abstract setNativeBridgeEventListener(): void;
  /**
   * This function calls the native operations for every WebView that implements the function
   *
   * @param operation: Operation string that will be called on the Native context
   * @param callbackId: The callbackId registered to send a response after the Native code responds
   * @param data: The data sended to the native context.
   */
  abstract nativeOperation(operation: string, callbackId: string, data: unknown): void;
}
