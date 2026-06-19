import { BridgeBSM } from '@proteo/bridge-bsm';
import { LoggerUtils } from '@proteo/logger-utils';
import type { WindowBSMBridgeMethod } from '@proteo/types';

export class BridgeAndroid extends BridgeBSM {
  /**
   * Implementation of the abstract definition to use the native operation
   * In this case, window.bsmbridge[OPERATION_TO_EXECUTE]
   *
   * Android admits a Web native object without parse to string
   *
   * @param operation: Operation to execute
   * @param callbackId: Callback id to response when the native context returns a value
   * @param data: The data sended to the native context. On Android Platform, data must be sended how a string format
   */
  override nativeOperation(operation: string, callbackId: string, data: unknown): void {
    const self = this.constructor as typeof BridgeBSM;
    LoggerUtils.getInstance().debug(`${self.LOGGER_PREFIX} - nativeOperation: operation <${operation}>`);
    LoggerUtils.getInstance().debug(`${self.LOGGER_PREFIX} - nativeOperation`, JSON.stringify(data));
    try {
      if (window.bsmbridge) {
        if (window.bsmbridge.processMessage) {
          window.bsmbridge.processMessage(operation, callbackId, JSON.stringify(data));
        } else {
          // ODP Legacy support
          (window.bsmbridge[operation] as WindowBSMBridgeMethod)(callbackId, JSON.stringify(data));
        }
      }
    } catch (error) {
      LoggerUtils.getInstance().warn(`${self.LOGGER_PREFIX} - nativeOperation: bsm bridge not support operation <${operation}>`, error);
    }
  }
}
