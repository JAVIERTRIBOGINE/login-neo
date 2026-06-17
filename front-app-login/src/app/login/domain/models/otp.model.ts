/**
 * OTP event interface
 */
export interface OtpEvent {
  /**
   * Signature value
   */
  code?: string;
  /**
   * Returns true if the component has valid signature, false otherwise
   */
  valid: boolean;
}

