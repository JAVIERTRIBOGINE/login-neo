import { describe, expect, it } from '@jest/globals';
import { PhoneNumberValidation } from '../phone-number-validation.js';

describe('phone number validation', () => {
  const TEST_VALUE = '666666666';
  const ERROR_VALUE = '000000000';
  it('should return true for a valid phone number', () => {
    expect(PhoneNumberValidation.isValidPhoneNumber(TEST_VALUE)).toBeTruthy();
  });

  it('should return false for an invalid phone number', () => {
    expect(PhoneNumberValidation.isValidPhoneNumber(ERROR_VALUE)).toBeFalsy();
  });
});
