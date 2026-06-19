import type { IframeEventRegistry } from '@proteo/iframe-loader';
import type { OpenOperativeEventPayload, ResizeEventPayload, TagRequest } from '@proteo/types';
import { initBridgeHandler } from './handlers/init-bridge.handler';
import { domResizeHandler } from './handlers/dom-resize.handler';
import { httpRequestHandler } from './handlers/http-request.handler';
import { loadUrlHandler } from './handlers/load-url.handler';
import { openOperativeHandler } from './handlers/open-operative.handler';
import { tagWithTealiumHandler } from './handlers/tag-with-tealium.handler';

export interface InitBridgePayload {
  callbackId?: string;
  externalData?: Record<string, unknown>;
}

export interface HttpRequestPayload {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string>;
}

export interface LoadUrlPayload {
  url: string;
}

export type LegacyIframeEventsType = {
  initBridge: InitBridgePayload;
  domResize: ResizeEventPayload;
  httpRequest: HttpRequestPayload;
  loadUrl: LoadUrlPayload;
  openOperative: OpenOperativeEventPayload;
  tagWithTealium: TagRequest<Record<string, unknown>>;
};

export const EVENT_MAP: IframeEventRegistry<LegacyIframeEventsType> = {
  initBridge: { handler: initBridgeHandler, publishToEventManager: false },
  domResize: { handler: domResizeHandler, publishToEventManager: false },
  httpRequest: { handler: httpRequestHandler, publishToEventManager: false },
  loadUrl: { handler: loadUrlHandler, publishToEventManager: false },
  openOperative: { handler: openOperativeHandler, publishToEventManager: false },
  tagWithTealium: { handler: tagWithTealiumHandler, publishToEventManager: false }
} as const;
