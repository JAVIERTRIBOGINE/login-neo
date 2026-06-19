import { EventManager } from '@proteo/event-bus';
import { LoggerUtils } from '@proteo/logger-utils';
import type {
  IframeEventDefinition,
  IframeEventRegistry,
  IframeIncomingMessage,
  IframeOutgoingMessage
} from './types/iframe-event.types.js';
import type { IframeLoaderOptions } from './types/iframe-loader-options.types.js';

const DEFAULT_LOG_PREFIX = '[IframeLoader]';
const DEFAULT_IFRAME_COMMON_EVT = 'message';

/**
 * Generic communication engine for iframes via postMessage.
 *
 * Events and their handlers are defined by the consumer using IframeEventRegistry<TEvents>.
 *
 * Flow:
 * iframe → postMessage({ operation, callbackId?, data })
 * → IframeLoader listens for 'message' on window
 * → looks up the operation in the registry
 * → executes the handler
 * → if callbackId exists: responds to the iframe via postMessage
 * → if publishToEventManager=true: publishes to EventManager (Proteo)
 *
 * @example Vanilla JS:
 * const loader = new IframeLoader(iframeEl, myEventRegistry);
 * // when destroying the component:
 * loader.destroy();
 *
 * @example Angular:
 * ngAfterViewInit() { this.loader = new IframeLoader(this.iframeEl.nativeElement, myRegistry); }
 * ngOnDestroy()     { this.loader.destroy(); }
 */
export class IframeLoader<TEvents extends Record<string, unknown> = Record<string, unknown>> {
  private readonly registry: Map<string, IframeEventDefinition<unknown, unknown>>;
  private readonly options: Required<IframeLoaderOptions>;
  private readonly messageListener: (event: MessageEvent) => void;

  constructor(
    private readonly iframe: HTMLIFrameElement,
    events: IframeEventRegistry<TEvents>,
    options?: IframeLoaderOptions
  ) {
    this.options = {
      logPrefix: DEFAULT_LOG_PREFIX,
      targetOrigin: '*',
      onUnknownEvent: (data) =>
        LoggerUtils.getInstance().warn(`${DEFAULT_LOG_PREFIX} Proteo4 event without operation handler: `, data),
      ...options
    };

    this.registry = new Map(Object.entries(events) as [string, IframeEventDefinition<unknown, unknown>][]);

    this.messageListener = this.handleMessage.bind(this);
    globalThis.addEventListener(DEFAULT_IFRAME_COMMON_EVT, this.messageListener);
  }

  public registerEvent<K extends string>(eventName: K, definition: IframeEventDefinition<unknown, unknown>): void {
    this.registry.set(eventName, definition);
  }

  public unregisterEvent(eventName: keyof TEvents | string): void {
    this.registry.delete(eventName as string);
  }

  public sendEvent(operation: string, data: unknown): void {
    this.iframe.contentWindow?.postMessage({ operation, data }, this.options.targetOrigin);
  }

  public destroy(): void {
    globalThis.removeEventListener(DEFAULT_IFRAME_COMMON_EVT, this.messageListener);
  }

  private async handleMessage(event: MessageEvent<IframeIncomingMessage>): Promise<void> {
    /**
     * Global DEFAULT_IFRAME_COMMON_EVT ['message'] listener.
     * Filters by event.source to ensure each IframeLoader instance
     * only processes messages from its specific iframe.
     */
    if (event.source !== this.iframe.contentWindow) return;

    const { operation, callbackId, data } = event.data ?? {};
    if (!operation) return;

    const definition = this.registry.get(operation);

    if (!definition) {
      this.options.onUnknownEvent(data, this.iframe);
      return;
    }

    try {
      const response = await definition.handler(data, this.iframe);
      this.propagateOperationResponse({ definition, operation, callbackId, data, response });
    } catch (error) {
      LoggerUtils.getInstance().error(`${this.options.logPrefix} Error handling operation "${operation}":`, error);
      this.propagateOperationResponse({ definition, operation, callbackId, data, error });
    }
  }

  private propagateOperationResponse({
    definition,
    operation,
    callbackId,
    data,
    response,
    error
  }: {
    definition: IframeEventDefinition<unknown, unknown>;
    operation: string;
    callbackId?: string;
    data: unknown;
    response?: unknown;
    error?: unknown;
  }): void {
    if (callbackId) {
      this.iframe.contentWindow?.postMessage(
        { callbackId, response, error } as IframeOutgoingMessage,
        this.options.targetOrigin
      );
    }

    if (definition.publishToEventManager) {
      const topic = definition.eventManagerTopic ?? operation;
      EventManager.getInstance().publish(topic, { payload: data, response, error });
    }
  }
}
