import type { NativeRequestError, NativeRequestParams, NativeRequestTrackingInfo } from './dynatrace.models.js';
import { StorageManager } from '@proteo/storage-utils';
import { isNative } from '@proteo/platform-utils';
import { LoggerUtils } from '@proteo/logger-utils';

// The limit is very low because it escalates exponentially
const MAX_DEBUG_LOGS = 2;
let debugLogCount = 0;

const logDebug = (message: string) => {
  if (debugLogCount >= MAX_DEBUG_LOGS) {
    return;
  }

  debugLogCount++;

  LoggerUtils.getInstance().debug(message, { remoteLogger: true, type: 'application' });

  if (debugLogCount === MAX_DEBUG_LOGS) {
    const throttledMessage = `[DynatraceTracker] ${MAX_DEBUG_LOGS} logs limit reached. No further logs from DynatraceTracker will be sent.`;
    LoggerUtils.getInstance().debug(throttledMessage, { remoteLogger: true, type: 'application' });
  }
};

export class DynatraceTracker {
  /** Initializes the trace and returns the x-dtc headers */
  public static startNativeHttpTracking(params: NativeRequestParams): Record<string, string> {
    if (!isNative()) {
      logDebug('[DynatraceTracker] Native http tracking start not allowed outside native.');
      return {};
    }

    let trackingInfo: NativeRequestTrackingInfo = { actionId: -1, headers: {} };

    if (typeof window.bsStartDtNativeHttpTracking === 'function') {
      trackingInfo = window.bsStartDtNativeHttpTracking({
        url: params.url,
        frameworkName: params.frameworkName
      });
      StorageManager.getInstance().set(params.requestId, trackingInfo.actionId);
    } else {
      logDebug('[DynatraceTracker] Native http tracking start method not found.');
    }

    return trackingInfo.headers;
  }

  /** Closes the trace and reports errors if any */
  public static finishNativeHttpTracking(requestId: string, error?: NativeRequestError): void {
    if (!isNative()) {
      logDebug('[DynatraceTracker] Native http tracking finish not allowed outside native.');
      return;
    }

    const actionId = StorageManager.getInstance().get(requestId) as number | undefined;

    if (actionId === undefined || actionId === null) {
      logDebug(`[DynatraceTracker] Cannot finish tracking: no actionId found for requestId [${requestId}].`);
      return;
    }

    StorageManager.getInstance().remove(requestId);

    if (typeof window.bsFinishDtNativeHttpTracking === 'function') {
      window.bsFinishDtNativeHttpTracking(actionId, error);
    } else {
      logDebug('[DynatraceTracker] Native http tracking finish method not found.');
    }
  }
}
