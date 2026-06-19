import type { BaseBridgeEvents, BridgeRequest } from './bridge.js';

/**
 * Callback definition fot the subscribe event. The callback receives the msg (topic message, for example SIGN.MY_ID) and the data published
 */
export type BsEventBusCallback<T = unknown, R = void> = (msg: string, data: T) => R;

export interface EventPayload<T = unknown> {
  data: T;
}

export interface ConsentsEventPayload {
  data: {
    appID: string;
    version: string;
  };
  consentedDate: string;
  groups: string;
}

export interface ContextChangedData {
  pageName: string;
}

export interface ConsentsEventData {
  consents: string;
}

export interface DeviceInfoData {
  platform: string;
  platformVersion: string; // (Ejemplo: 25.03.10.226588134)
  userAgent: string; // (Ejemplo: Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148")
  appVersion: string; // s(Ejemplo: 16.4)
}

export interface DeeplinkData {
  deeplink: string;
}

export interface EventBusEvent {
  topic: string;
  scope?: string;
}

/**
 * Event for Subscribe action
 */
export interface EventBusSubscribe<T = unknown> extends EventBusEvent {
  callback: BsEventBusCallback<T>;
}

/**
 * Event for Subscribe with token response action
 */
export interface EventBusSubscribeWithToken<T = unknown> extends EventBusSubscribe<T> {
  tokenCallback?: (token: string) => void;
}

/**
 * Event for Publish action
 */
export interface EventBusPublish extends EventBusEvent {
  detail: unknown;
}

/**
 * PubSub extension for debug mode
 */
export interface PubSubInterface extends PubSubJS.Base {
  immediateExceptions: boolean;
}

/**
 * EVENT MANAGER
 */

export interface PublishWithResponseOptions {
  customID: string;
}

export interface PublishOptions {
  eventID: string;
}

export interface SubscribeOptions {
  eventID: string;
}
export interface IEventManager {
  /**
   * Publish an event to other microfrontend or the bridge and subscribes to its response.
   * It returns a promise resolved once the response from the other has come
   * @param eventName The event name to be published
   * @param payload the information to be passed
   * @param options optional parameters for identifying unique requests
   * @Returns a promise with the event response from target. The promise will be rejected after a timeout
   */
  publishWithResponse<T, K extends string = string>(
    eventName: K,
    payload?: K extends keyof BaseBridgeEvents ? BaseBridgeEvents[K] : unknown,
    options?: PublishWithResponseOptions
  ): Promise<T>;
  /**
   * Publish an event to other microfrontend or the bridge.
   * @param eventName The event name to be published
   * @param payload the information to be passed
   * @param eventUID event unique ID for identifying unique requests
   */
  publish<K extends string>(
    eventName: K,
    payload?: K extends keyof BaseBridgeEvents ? BaseBridgeEvents[K] : unknown,
    options?: PublishOptions
  ): void;

  /**
   * Subscribe utility for subscribe a concrete event name into the event bus
   * and execute a callback at the end
   * @param eventName event name
   * @param callback callback function to execute
   */
  subscribe<T = unknown>(
    eventName: string,
    callback: BsEventBusCallback<T>,
    options?: SubscribeOptions
  ): Promise<string>;

  /**
   * Unsubscribe utility for removing a previously subscribed event callback from the event bus using the PubSubJS token.
   * @param token The PubSubJS token received when subscribing
   */
  unsubscribe(token: string): void;

  /**
   * Subscribe utility for subscribe a concrete event name into the event bus
   * and publish some data after the subscribe event received
   * @param eventName event name
   * @param publishData data to be returned when the event is received
   */
  subscribeAndPublish(eventName: string, publishData: unknown): void;

  /**
   * Subscribe utility for subscribe a concrete event name into the event bus
   * and publish some data after the subscribe event received as response
   * @param eventName event name
   * @param process function that processes payload and returns data
   * @param options subscribe options
   */
  subscribeForResponse(eventName: string, process: BsEventBusCallback<BridgeRequest>, options?: SubscribeOptions): void;
}
