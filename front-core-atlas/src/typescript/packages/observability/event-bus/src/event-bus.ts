import { LoggerUtils } from '@proteo/logger-utils';
import type { EventBusEvent, EventBusPublish, EventBusSubscribe, PubSubInterface } from '@proteo/types';
import 'pubsub-js';
import {
  EVENT_BUS_PUBLISH_EVENT_NAME,
  EVENT_BUS_SUBSCRIBE_EVENT_NAME,
  EVENT_BUS_UNSUBSCRIBE_EVENT_NAME,
  EVENT_BUS_UNSUBSCRIBE_TOKEN
} from './constants.js';

export class EventBus {
  constructor() {
    this.registerSubscribeEvent();
    this.registerPublishEvent();
    this.registerUnSubscribeEvent();
    this.registerUnSubscribeTokenEvent();
  }

  /**
   * Register a listener to handle the subscribe event into the Event Bus stack
   */
  private registerSubscribeEvent(): void {
    window.addEventListener(EVENT_BUS_SUBSCRIBE_EVENT_NAME, (event: Event) => {
      const e = event as CustomEvent<EventBusSubscribe & { tokenCallback?: (token: string) => void }>;
      const token = this.subscribe(e.detail);
      LoggerUtils.getInstance().debug('[EventBus - SUBSCRIBE]', e.detail, {
        remoteLogger: true,
        type: 'application'
      });
      if (typeof e.detail.tokenCallback === 'function') {
        e.detail.tokenCallback(token);
      }
    });
  }

  /**
   * Register a listener to handle the public event into the Event Bus stack
   */
  private registerPublishEvent(): void {
    window.addEventListener(EVENT_BUS_PUBLISH_EVENT_NAME, (event: Event) => {
      const e = event as CustomEvent<EventBusPublish>;
      this.publish(e.detail);
      LoggerUtils.getInstance().debug('[EventBus - PUBLISH]', e.detail, {
        remoteLogger: true,
        type: 'application'
      });
    });
  }

  /**
   * Register a listener to handle the unsubscribe event into the Event Bus stack
   */
  private registerUnSubscribeEvent(): void {
    window.addEventListener(EVENT_BUS_UNSUBSCRIBE_EVENT_NAME, (event: Event) => {
      const e = event as CustomEvent<EventBusEvent>;
      this.unSubscribe(e.detail);
      LoggerUtils.getInstance().debug('[EventBus - UNSUBSCRIBE]', e.detail, {
        remoteLogger: true,
        type: 'application'
      });
    });
  }

  /**
   * Register a listener to handle the unsubscribe with token event into the Event Bus stack
   */
  private registerUnSubscribeTokenEvent(): void {
    window.addEventListener(EVENT_BUS_UNSUBSCRIBE_TOKEN, (event: Event) => {
      const e = event as CustomEvent<string>;
      const token = e.detail;
      this.unSubscribeToken(token);
      LoggerUtils.getInstance().debug('[EventBus - UNSUBSCRIBE WITH TOKEN]', token, {
        remoteLogger: true,
        type: 'application'
      });
    });
  }

  /**
   * Get the topic retrieved into the EventBus event
   * @param event : Event to check the topic
   */
  private getTopic(event: EventBusSubscribe | EventBusPublish | EventBusEvent): string {
    return event.topic + (event && event.scope ? '.' + event.scope : '');
  }

  /**
   * Add a subscribe action into the PubSub library and return a token
   * @param event: EventBusSubscribe
   */
  public subscribe(event: EventBusSubscribe): string {
    return PubSub.subscribe(this.getTopic(event), event.callback);
  }

  /**
   * Remove all subscribers for the topic and scope retrieved
   * @param event: EventBusSubscribe
   */
  public unSubscribe(event: EventBusEvent): void {
    PubSub.unsubscribe(this.getTopic(event));
  }

  /**
   * Unsubscribe using a token
   * @param token: string
   */
  public unSubscribeToken(token: string): void {
    PubSub.unsubscribe(token);
  }

  /**
   * Add a publish action into the PubSub library
   * @param event: EventBusPublish
   */
  public publish(event: EventBusPublish): void {
    PubSub.publish(this.getTopic(event), event.detail);
  }

  /**
   *
   * @param flag
   */
  public enableDebugMode(flag = false): void {
    (PubSub as PubSubInterface).immediateExceptions = flag;
  }
}
