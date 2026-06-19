import { ElementRef } from '@angular/core';
import { getDriver, storedTokens } from '@proteo/data-manager';
import { I18n } from '@proteo/i18n-utils';
import { LoggerUtils } from '@proteo/logger-utils';
import { DataManagerRequest } from '@proteo/types';
import { createUUID } from '@proteo/uuid-utils';
import { EventManager } from '@proteo/event-bus';
import type { BridgeRequest, TagRequest, TagResponse, OpenOperativeBridgeRequest, OpenOperativeEventPayload } from '@proteo/types';

export enum LegacyLoaderEvents {
  'initBridge',
  'domResize',
  'httpRequest',
  'loadUrl',
  'openOperative',
  'tagWithTealium'
}

export const handlerEvent = {
  initBridge: initBridgeHandler,
  domResize: domResizeHandler,
  httpRequest: httpRequestHandler,
  loadUrl: loadUrlHandler,
  openOperative: openOperativeHandler,
  tagWithTealium: tagWithTealiumHandler,
  default: (data: any, iframe: ElementRef<HTMLIFrameElement>) => LoggerUtils.getInstance().warn(`Proteo4 event without operation handler: `, data)
};

function initBridgeHandler(data: any, iframe: ElementRef<HTMLIFrameElement>) {
  LoggerUtils.getInstance().debug(`[initBridgeHandler] data: `, data);
  const tokens = storedTokens();
  const response = {
    callbackId: data.callbackId,
    response: {
      language: I18n.getInstance().language,
      auth: tokens,
      externalData: {}
    }
  };
  iframe.nativeElement.contentWindow.postMessage(response, '*');
}

function domResizeHandler(data: any, iframe: ElementRef<HTMLIFrameElement>) {
  LoggerUtils.getInstance().debug(`[domResizeHandler] data: `, data);
  const iframeHeight = data.data.height + 20;
  iframe.nativeElement.height = iframeHeight.toString();
}

async function httpRequestHandler(data: any, iframe: ElementRef<HTMLIFrameElement>) {
  LoggerUtils.getInstance().debug(`[httpRequestHandler] acabo de entrar: `);
  const requestData = data.data;

  const request: DataManagerRequest = {
    url: requestData.path,
    method: requestData.method,
    headers: requestData.headers,
    data: requestData.body,
    params: requestData.params
  };

  try {
    const responseHTTP = await getDriver('P4')?.http(request);
    LoggerUtils.getInstance().debug(`[httpRequestHandler] response: `, responseHTTP);

    const responseEvent = {
      callbackId: data.callbackId,
      response: responseHTTP
    };
    iframe.nativeElement.contentWindow.postMessage(responseEvent, '*');
  } catch (error) {
    LoggerUtils.getInstance().debug(`[httpRequestHandler] error: `, error);

    const responseEvent = {
      callbackId: data.callbackId,
      response: error
    };
    iframe.nativeElement.contentWindow.postMessage(responseEvent, '*');
  }
}

async function openOperativeHandler(payload: OpenOperativeEventPayload, iframe: ElementRef<HTMLIFrameElement>) {
  LoggerUtils.getInstance().debug('[openOperativeHandler] operativeName:', payload.operativeName);

  const bridgeRequest: OpenOperativeBridgeRequest = {
    method: 'openOperative',
    data: payload
  };

  const evtReponse = await EventManager.getInstance().publishWithResponse('OPEN_OPERATIVE', bridgeRequest);
  iframe.nativeElement.contentWindow.postMessage(evtReponse, '*');
}

async function tagWithTealiumHandler(payload: TagRequest<unknown>, iframe: ElementRef<HTMLIFrameElement>) {
  LoggerUtils.getInstance().debug('[tagWithTealiumHandler] screenName:', payload.options?.screenName);

  const bridgeRequest: BridgeRequest = {
    method: 'tagWithTealium',
    data: {
      screenName: payload.options?.screenName,
      params: JSON.stringify(payload.data, null, 0)
    }
  };

  const evtReponse = await EventManager.getInstance().publishWithResponse<TagResponse<Record<string, unknown>>>('TEALIUM', bridgeRequest, {
    customID: createUUID()
  });

  iframe.nativeElement.contentWindow.postMessage(evtReponse, '*');
}

function loadUrlHandler(data: any, iframe: ElementRef<HTMLIFrameElement>) {
  LoggerUtils.getInstance().debug(`[loadUrlHandler] data: `, data);
  iframe.nativeElement.src = data.data.url;
}
