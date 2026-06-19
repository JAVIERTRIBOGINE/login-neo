export interface IframeIncomingMessage<TData = unknown> {
  operation: string;
  callbackId?: string;
  data?: TData;
}

export interface IframeOutgoingMessage<TResponse = unknown> {
  callbackId: string;
  response?: TResponse;
  error?: unknown;
}

/**
 * Iframe event handler.
 *
 * The consumer defines how to process the payload.
 * If a value is returned (or a Promise that resolves to a value), that value
 * is sent back to the iframe as a response when the message includes a callbackId.
 *
 * @param payload - data received from the iframe
 * @param iframe  - reference to the HTMLIFrameElement
 */
export type IframeEventHandler<TPayload = unknown, TResponse = void> = (
  payload: TPayload,
  iframe: HTMLIFrameElement
) => TResponse | Promise<TResponse>;

export interface IframeEventDefinition<TPayload = unknown, TResponse = void> {
  handler: IframeEventHandler<TPayload, TResponse>;
  /**
   * If true, publishes the event to the EventManager after executing the handler.
   * This allows the shell or other micro-frontends to react to the iframe event.
   *
   * @default false
   */
  publishToEventManager?: boolean;
  /**
   * Topic name in the EventManager.
   * If not specified, it defaults to the operation name.
   */
  eventManagerTopic?: string;
}

/**
 * Event registry indexed by operation name.
 *
 * TEvents is a Record<string, unknown> where:
 * - key   = operation name received via postMessage
 * - value = message payload type
 *
 * Extensible: consumers define their own event map and pass it to the IframeLoader.
 *
 * @example
 * type MyEvents = {
 * domResize:  { height: number };
 * loadUrl:    { url: string };
 * myEvent:    { customData: string };
 * };
 * const loader = new IframeLoader<MyEvents>(iframe, registry);
 */
export type IframeEventRegistry<TEvents extends Record<string, unknown> = Record<string, unknown>> = {
  [K in keyof TEvents]: IframeEventDefinition<TEvents[K], unknown>;
};
