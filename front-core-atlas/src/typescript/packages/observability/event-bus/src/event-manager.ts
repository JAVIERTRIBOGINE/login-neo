import { LoggerUtils } from '@proteo/logger-utils';
import { normalizeId } from '@proteo/string-utils';

import type {
  BaseBridgeEventPayload,
  BaseBridgeEvents,
  BridgeRequest,
  BsEventBusCallback,
  EventBusPublish,
  EventBusSubscribe,
  EventBusSubscribeWithToken,
  EventManagerConfig,
  EventPayload,
  IEventManager,
  PublishOptions,
  PublishWithResponseOptions,
  SubscribeOptions
} from '@proteo/types';
import {
  EVENT_BUS_PUBLISH_EVENT_NAME,
  EVENT_BUS_SUBSCRIBE_EVENT_NAME,
  EVENT_BUS_UNSUBSCRIBE_EVENT_NAME,
  EVENT_BUS_UNSUBSCRIBE_TOKEN
} from './constants.js';
import { createUUID, matchesUUID } from '@proteo/uuid-utils';

const DEFAULT_TIMEOUT = 10000;

/**
 * Utility class for managing proteo4 events.
 * You can publish an event if it is one way or subscribe to a response
 */
export class EventManager implements IEventManager {
  private static _instance: IEventManager;
  private readonly baseEvent: BaseBridgeEventPayload;
  private readonly eventResponseTimeout: number;

  constructor(appName?: string, appVersion?: string, eventResponseTimeout?: number) {
    this.eventResponseTimeout = eventResponseTimeout || DEFAULT_TIMEOUT;
    this.baseEvent = {
      appID: normalizeId(appName || ''),
      version: appVersion || ''
    };
    LoggerUtils.getInstance().debug(
      `[EventManager] Configured with appID: ${this.baseEvent.appID}, version: ${this.baseEvent.version} and timeout: ${this.eventResponseTimeout}`,
      {
        remoteLogger: true,
        type: 'application'
      }
    );
  }
  static initInstance(appName: string, appVersion: string, eventConfig?: EventManagerConfig): void {
    this.generateUniqueEventsDictionary(eventConfig?.UNIQUE_EVENTS);
    const instance = new EventManager(appName, appVersion, eventConfig?.TIMEOUT);
    window.BsEventManager = instance;
    // Added fallback in case _instance is being used
    this._instance = instance;
  }

  static getInstance(): IEventManager {
    if (!window.BsEventManager && !this._instance) {
      this.initInstance('', '', { TIMEOUT: DEFAULT_TIMEOUT });
    }
    return window.BsEventManager;
  }

  private static generateUniqueEventsDictionary(uniqueEvents?: string[]) {
    if (!uniqueEvents || uniqueEvents.length === 0) return;
    window.BsEventDictionary = new Map<string, boolean>();
    uniqueEvents.forEach((uniqueEvent) => window.BsEventDictionary.set(uniqueEvent, false));
  }

  /**
   * Generate concrete response topic for additional scope
   * @param eventName event name
   * @param additionalScope  additional scope
   */
  private generateConcreteResponseTopic(eventName: string, additionalScope?: string): string {
    return `${eventName}_RESPONSE.${additionalScope}.${this.baseEvent.appID}`;
  }

  publishWithResponse<T, K extends string = string>(
    eventName: K,
    payload?: K extends keyof BaseBridgeEvents ? BaseBridgeEvents[K] : unknown,
    options?: PublishWithResponseOptions
  ): Promise<T> {
    const id: string = options?.customID ?? createUUID();
    const responseTopic: string = this.generateConcreteResponseTopic(eventName, id);
    return new Promise((resolve, reject) => {
      const eventTimeout: number = window.setTimeout(() => {
        const msg = `Proteo4 ${eventName} Event Response Timeout after ${this.eventResponseTimeout} ms`;
        LoggerUtils.getInstance().warn(msg, { remoteLogger: true, type: 'application' });
        window.dispatchEvent(new CustomEvent(EVENT_BUS_UNSUBSCRIBE_EVENT_NAME, { detail: responseTopic }));
        reject(msg);
      }, this.eventResponseTimeout);
      const eventResponse: EventBusSubscribe = {
        topic: responseTopic,
        callback: (_msg, data) => {
          window.dispatchEvent(new CustomEvent(EVENT_BUS_UNSUBSCRIBE_EVENT_NAME, { detail: responseTopic }));
          clearTimeout(eventTimeout);
          resolve(data as T);
        }
      };
      window.dispatchEvent(new CustomEvent(EVENT_BUS_SUBSCRIBE_EVENT_NAME, { detail: eventResponse }));
      const publishOptions = { eventID: id };
      this.publish(eventName, payload, publishOptions);
    });
  }

  public publish<T extends string>(
    eventName: T,
    payload?: T extends keyof BaseBridgeEvents ? BaseBridgeEvents[T] : unknown,
    options?: PublishOptions
  ): void {
    const scope = options?.eventID ? '.' + options.eventID : '';
    const eventRequest: EventBusPublish = {
      topic: `${eventName}${scope}.${this.baseEvent.appID}`,
      detail: {}
    };

    const data = (payload && (payload as unknown as EventPayload).data) || {};
    eventRequest.detail =
      typeof payload === 'object'
        ? { ...payload, data: { ...this.baseEvent, ...data } }
        : { ...this.baseEvent, data: payload };
    window.dispatchEvent(new CustomEvent(EVENT_BUS_PUBLISH_EVENT_NAME, { detail: eventRequest }));
  }

  private removePrefixTopic(str: string, prefix: string): string {
    return str.slice(prefix.length);
  }

  /**
   * Utility to subscribe to a specific event name in the event bus
   * and execute a callback at the end
   * @param eventName Event name
   * @param callback Callback function to execute
   * @returns Promise<string> that resolves with the generated token
   */
  public subscribe<T = unknown>(
    eventName: string,
    callback: BsEventBusCallback<T>,
    options?: SubscribeOptions
  ): Promise<string> {
    if (window.BsEventDictionary?.has(eventName)) {
      if (window.BsEventDictionary.get(eventName)) {
        const message = `Couldn't subscribe to ${eventName}. Unique events can only be subscribed once`;
        LoggerUtils.getInstance().warn(message, { remoteLogger: true, type: 'application' });
        return Promise.reject(message);
      }
      window.BsEventDictionary.set(eventName, true);
    }

    const hasEventId = !!options?.eventID;
    const topic = hasEventId ? `${eventName}.${options.eventID}.${this.baseEvent.appID}` : eventName;

    const wrapped: BsEventBusCallback<T> = (msg, data) => {
      if (hasEventId) return callback(msg, data);
      const scope = this.removePrefixTopic(msg, eventName);
      const parts = scope.split('.');
      const endsWithAppId = parts[parts.length - 1] === this.baseEvent.appID;
      if (endsWithAppId && (parts.length === 2 || matchesUUID(parts[parts.length - 2]))) callback(msg, data);
    };

    return new Promise((resolve) => {
      const eventResponse: EventBusSubscribeWithToken<T> = {
        topic,
        callback: wrapped,
        tokenCallback: (token: string) => resolve(token)
      };
      LoggerUtils.getInstance().debug(`[EventManager] Subscribing to event ${eventName} into the event bus`, {
        remoteLogger: true,
        type: 'application'
      });
      window.dispatchEvent(new CustomEvent(EVENT_BUS_SUBSCRIBE_EVENT_NAME, { detail: eventResponse }));
    });
  }

  /**
   * Unsubscribe utility for removing a subscription from the event bus using its token
   * @param token The subscription token received from subscribe
   */
  public unsubscribe(token: string): void {
    LoggerUtils.getInstance().debug(`[EventManager] Unsubscribing from event bus with token: ${token}`, {
      remoteLogger: true,
      type: 'application'
    });
    window.dispatchEvent(new CustomEvent(EVENT_BUS_UNSUBSCRIBE_TOKEN, { detail: token }));
  }

  /**
   * Subscribe utility for subscribe a concrete event name into the event bus
   * and publish some data after the subscribe event received
   * @param eventName event name
   * @param publishData data to be returned when the event is received
   * @deprecated use subscribeForResponse instead
   */
  public subscribeAndPublish(eventName: string, publishData: unknown): void {
    this.subscribe(eventName, (topic) => {
      const topicArr = topic.split('.');
      const topicOperation = topicArr.shift();
      if (topicOperation) {
        const responseTopic: string = topic.replace(topicOperation, `${topicOperation}_RESPONSE`);
        LoggerUtils.getInstance().debug(
          `[EventManager] Publishing and event into ${responseTopic} with data:`,
          publishData,
          {
            remoteLogger: true,
            type: 'application'
          }
        );
        this.publish(responseTopic, publishData);
      }
    });
  }

  /**
   * Subscribe utility for subscribe a concrete event name into the event bus
   * and publish some data after the subscribe event received as response
   * @param eventName event name
   * @param process function that processes payload and returns data
   * @param options subscribe options
   */
  public subscribeForResponse(
    eventName: string,
    process: BsEventBusCallback<BridgeRequest, unknown>,
    options?: SubscribeOptions
  ): Promise<string> {
    const eventID: string | undefined = options?.eventID;
    const callback: BsEventBusCallback<BridgeRequest> = async (msg: string, data: BridgeRequest) => {
      if (data) {
        const scope = this.removePrefixTopic(msg, eventName);
        const requestID = eventID ?? scope.split('.')[1];
        const publishOptions: PublishOptions | undefined = requestID ? { eventID: requestID } : undefined;
        const responsePayload: unknown = await process(msg, data);
        this.publish(eventName + '_RESPONSE', responsePayload, publishOptions);
      } else {
        LoggerUtils.getInstance().error(`[EventManager] [subscribeToRespond] Publish did not send data`, {
          remoteLogger: true,
          type: 'application'
        });
      }
    };
    return this.subscribe(eventName, callback as BsEventBusCallback, options);
  }
}
