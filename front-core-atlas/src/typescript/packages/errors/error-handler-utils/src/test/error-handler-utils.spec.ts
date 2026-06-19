import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LoggerUtils } from '@proteo/logger-utils';
import { unwatchErrors, watchErrors } from '../error-handler-utils.js';

const errorDetails: ErrorEventInit = {
  message: 'Something bad happens anywhere in the code!',
  lineno: 123,
  colno: 12,
  filename: 'something.js'
};

const throwErrorEvent = (errorEventInit: ErrorEventInit) => {
  const errorEvent = new ErrorEvent('error', errorEventInit);
  window.dispatchEvent(errorEvent);
};

describe('error-handler-utils', () => {
  const logger = LoggerUtils.getInstance();
  logger.error = jest.fn();

  beforeEach(() => {
    watchErrors();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call LoggerUtils.error', () => {
    throwErrorEvent(errorDetails);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('should log a complete message with stack for in file errors', () => {
    const error = new Error('Unhandled error');
    error.stack = 'Error: Unhandled error at Object.<anonymous> (error-handler-utils.spec.ts:4:15)';
    errorDetails.error = error;
    throwErrorEvent(errorDetails);
    const expectedMessage = `[Unhandled] ${errorDetails.message} Stack: ${error.stack}. Occurred in ${errorDetails.filename}:${errorDetails.lineno}:${errorDetails.colno}`;
    expect(logger.error).toHaveBeenCalledWith(expectedMessage, { remoteLogger: true, type: 'application' });
  });

  it('should log a message for inline errors', () => {
    const error = new Error('Unhandled error');
    error.stack = '';
    errorDetails.error = error;
    throwErrorEvent({ message: errorDetails.message, error });
    const expectedMessage = `[Unhandled] ${errorDetails.message} Occurred in inlineScriptOrDynamicEvalCode:?:?`;
    expect(logger.error).toHaveBeenCalledWith(expectedMessage, { remoteLogger: true, type: 'application' });
  });

  it('should be able to unwatch errors', () => {
    unwatchErrors();
    throwErrorEvent(errorDetails);
    expect(logger.error).toHaveBeenCalledTimes(0);
  });
});
