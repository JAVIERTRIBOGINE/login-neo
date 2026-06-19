import { BridgeBSM } from '@proteo/bridge-bsm';
import { LoggerUtils } from '@proteo/logger-utils';
export class BridgeIos extends BridgeBSM {
  /**
   * Implementation of the abstract definition to use the native operation
   * In this case, window.webkit.messageHandlers[OPERATION_TO_EXECUTE].postMessage
   *
   * WARN! ==> PostMessage only admit a string
   *
   * @param operation: Operation to execute
   * @param callbackId: Callback id to response when the native context returns a value
   * @param data: The data sended to the native context
   */
  nativeOperation(operation: string, callbackId: string, data: unknown): void {
    const self = this.constructor as typeof BridgeBSM;
    const request = {
      callbackId,
      params: data
    };
    LoggerUtils.getInstance().debug(`${self.LOGGER_PREFIX} - nativeOperation: operation <${operation}>`);
    LoggerUtils.getInstance().debug(`${self.LOGGER_PREFIX} - nativeOperation`, JSON.stringify(request));

    try {
      if (window.webkit) {
        window.webkit.messageHandlers[operation].postMessage(JSON.stringify(request));
      } else {
        throw new Error('Webkit not available');
      }
    } catch (error) {
      LoggerUtils.getInstance().warn(
        `${self.LOGGER_PREFIX} - nativeOperation: bsm bridge not support operation <${operation}>`,
        error
      );
    }
  }
}
