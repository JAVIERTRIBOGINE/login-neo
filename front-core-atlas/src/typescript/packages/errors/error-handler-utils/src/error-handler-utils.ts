import { LoggerUtils } from '@proteo/logger-utils';

/**
 * Send a log that will end in Kibana with the unhandled error message
 *
 * @param {ErrorEvent} event Error event object
 */
function logError(event: ErrorEvent) {
  const { message, filename, lineno, colno, error } = event;
  let errorMessage = `[Unhandled] ${message || error.message || error.name}`;
  if (error && error.stack) {
    errorMessage = `${errorMessage} Stack: ${error.stack}.`;
  }
  const jsFile = (/[^/]+\.js/i.exec(filename || '') || ['inlineScriptOrDynamicEvalCode'])[0];
  errorMessage = `${errorMessage} Occurred in ${jsFile}:${lineno || '?'}:${colno || '?'}`;

  LoggerUtils.getInstance().error(errorMessage, {
    remoteLogger: true,
    type: 'application'
  });
}

/**
 * Add window error Listener
 */
export function watchErrors(): void {
  window.addEventListener('error', logError);
}

/**
 * Remove window error handler listener
 */
export function unwatchErrors(): void {
  window.removeEventListener('error', logError);
}
