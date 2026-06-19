import { getDriver } from '@proteo/data-manager';
import { LoggerUtils } from '@proteo/logger-utils';
import type { BridgeHttpRequest, WebBridgeRequest, WebBridgeResponse } from '@proteo/types';

/**
 * Expose a Custom Event API for Proteo4 from an Iframe postMessage event
 */
export class ExternalWebLoaderBridge {
  private readonly PROTEO4_CUSTOM_EVENT = 'Proteo4Event';
  private readonly iframe?: HTMLIFrameElement;

  /**
   * Class constructor
   * @param iframe instance of the iframe
   */
  constructor(iframe?: HTMLIFrameElement) {
    LoggerUtils.getInstance().debug('[ExternalWebLoaderBridge][constructor] iframe: ', iframe, {
      remoteLogger: true,
      type: 'application'
    });

    this.iframe = iframe;
    this.registerListenerToExposeEvents();
    this.registerListenerToReceiveEvents();
  }

  /**
   * Listens for a Message Event received from a Post Message. It saves the callback ID
   * and emits the event as a Custom Event, registering its response
   */
  private registerListenerToExposeEvents() {
    window.addEventListener('message', async (ev: MessageEvent<WebBridgeRequest>) => {
      let msg, data, response;

      LoggerUtils.getInstance().debug(
        '[ExternalWebLoaderBridge][addEventListener(message)] Receiving http event: ',
        ev.data,
        {
          remoteLogger: true,
          type: 'application'
        }
      );

      if (ev.data.operation === 'httpRequest') {
        data = ev.data.data as BridgeHttpRequest;

        // FIXME: unify all http methods for dynamic call with data.method
        switch (data.method) {
          case 'GET':
            response = await getDriver()?.get('', data.headers, data.params);
            break;
          case 'POST':
            response = await getDriver()?.post('', data.body, data.headers, data.params);
            break;
          default:
            LoggerUtils.getInstance().error('HTTP method not supported: ', data.method, {
              remoteLogger: true,
              type: 'application'
            });
            break;
        }

        LoggerUtils.getInstance().debug(
          '[ExternalWebLoaderBridge][addEventListener(message)] http response: ',
          response,
          {
            remoteLogger: true,
            type: 'application'
          }
        );

        msg = { callbackId: ev.data.callbackId, response };
        this.iframe?.contentWindow?.postMessage(msg, '*');
      } else {
        window.dispatchEvent(new CustomEvent(ev.data.operation, { detail: ev.data }));
      }
    });
  }

  /**
   * Listens for a proteo4 custom event and proxies it as a post message
   * If it is a response event, it should have the callbackId of the proteo4 Request
   */
  private registerListenerToReceiveEvents() {
    window.addEventListener(this.PROTEO4_CUSTOM_EVENT, (ev: Event) => {
      const payload = (ev as CustomEvent<WebBridgeResponse>).detail;

      LoggerUtils.getInstance().debug(
        '[ExternalWebLoaderBridge][registerListenerToReceiveEvents] Receiving event: ',
        payload,
        {
          remoteLogger: true,
          type: 'application'
        }
      );

      let msg;
      if (payload && payload.callbackId && payload.data) {
        // Response from native bridge
        msg = { callbackId: payload.callbackId, response: payload.data };
      } else if (payload && payload.operation && payload.data) {
        // Message from native bridge
        msg = { operation: payload.operation, response: payload.data };
      } else {
        LoggerUtils.getInstance().error(
          '[ExternalWebLoaderBridge: registerListenerToReceiveEvents] malformed event from native bridge',
          ev,
          {
            remoteLogger: true,
            type: 'application'
          }
        );
      }

      this.iframe?.contentWindow?.postMessage(msg, '*');
    });
  }
}
