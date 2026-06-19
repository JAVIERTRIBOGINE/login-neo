import { Bridge } from '@proteo/bridge';
import { LoggerUtils } from '@proteo/logger-utils';
import type { BranchesBridgeRequest, BridgeRequest, BranchesOperation, EeNativeOperationPayload } from '@proteo/types';
import { ProteoSync } from './proteo-sync.js';

/**
 * Specific implementation for JxBrowser platform
 *
 */
export class BridgeWebEE extends Bridge {
  private readonly map: Record<string, BranchesOperation> = { initBridge: this.initEE.bind(this) };
  constructor(actions?: string[], actionsBroadcast?: string[]) {
    super(actions, actionsBroadcast);
    this.initProteoSync();
  }

  onBridgeEvent(ev: Event): void {
    try {
      const data = (ev as CustomEvent<{ callbackId: string; response: BridgeRequest }>).detail;
      if (data?.callbackId && data?.response) {
        const cb = this.bridgeGetCallback(data.callbackId);
        cb(data.response);
      } else {
        LoggerUtils.getInstance().error(`[BridgeWebEE] Data response malformed`);
      }
    } catch {
      LoggerUtils.getInstance().error(`[BridgeWebEE] ERROR executing the callback`);
    }
  }

  setNativeBridgeEventListener(): void {
    LoggerUtils.getInstance().debug('[BridgeWebEE: setNativeBridgeEventListener]', {
      remoteLogger: true,
      type: 'application'
    });
    if (!this.isEventSetted) {
      this.isEventSetted = true;
      this.onBridgeEvent = this.onBridgeEvent.bind(this);
      window.addEventListener('webEEBridge', this.onBridgeEvent);
    }
  }

  destroy(): void {
    if (this.isEventSetted) {
      window.removeEventListener('webEEBridge', this.onBridgeEvent);
    }
  }

  /**
   * Sends the message to the parent iframe
   * @param operation the operation to be executed in the parent
   * @param callbackId a callback identifier for asynchronous events
   * @param data the operation payload
   */
  nativeOperation(operation: string, callbackId: string, data: EeNativeOperationPayload): void {
    LoggerUtils.getInstance().debug('[BridgeEe: nativeOperation] ==> ', operation, callbackId, data, {
      remoteLogger: true,
      type: 'application'
    });
    const msg = {
      operation,
      callbackId,
      data
    } as BranchesBridgeRequest;

    if (data?.type && data?.type === 'EE_operative' && data?.msg) {
      const msg = data.msg.replace('{{callbackId}}', callbackId);
      LoggerUtils.getInstance().debug('[BridgeEe: nativeOperation EE_operative] ==> ', msg);
      this.postMessage(operation, msg);
    } else if (window.eclipseDesktop && window.eclipseDesktop.sendP4) {
      window.eclipseDesktop.sendP4(JSON.stringify(msg));
    } else {
      this.map[operation](msg);
    }
  }

  /**
   * Temporally function to retrieve the language from Escritorio Eclipse context
   *
   * @param request: BranchesBridgeRequest
   */
  private initEE(request: BranchesBridgeRequest): void {
    const GET_LANGUAGE = 'getLanguage';
    const message = 'language,0,' + GET_LANGUAGE;
    window[GET_LANGUAGE] = (data: unknown) => {
      window.dispatchEvent(
        new CustomEvent('webEEBridge', { detail: { callbackId: request.callbackId, response: data } })
      );
      delete window[GET_LANGUAGE];
    };
    this.postMessage('getContext', message);
  }

  /**
   * Auxiliary function to call to eclipse Desktop utility
   * @param func: Function name to execute on EE environment
   * @param message: Message string with the payload content
   */
  private postMessage(func: string, message: string): void {
    if (window.eclipseDesktop.send) {
      window.eclipseDesktop.send(`${func},${message}`);
    }
  }

  private initProteoSync() {
    if (!window.proteoSync) {
      window.proteoSync = new ProteoSync();
    }
  }
}
