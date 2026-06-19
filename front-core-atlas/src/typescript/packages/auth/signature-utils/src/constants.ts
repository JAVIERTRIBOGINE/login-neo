/**
 * String used to hash OTP
 */
export const HASH_ATM_LABEL = 'AC.000081.000000.000000.000000.200210.OTPAPLICACANAL';

/**
 * Error messages constants
 */
export const SIGNATURE_ERRORS = {
  RECALL_WITH_HEADERS_NO_REQUEST_FOUND: '[recallWithHeaders] No request found for requestId:',
  RECALL_WITH_HEADERS_NO_DRIVER_FOUND: '[recallWithHeaders] No driver found',
  CONFIRM_NO_REQUEST_FOUND: '[confirmSignature] No request found for requestId:',
  CONFIRM_NO_DRIVER_FOUND: '[confirmSignature] No driver found',
  CONFIRM_NO_OTP_PROVIDED: '[confirmSignature] No otp provided'
};
