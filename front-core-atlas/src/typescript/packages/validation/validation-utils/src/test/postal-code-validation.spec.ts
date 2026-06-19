import { describe, expect, it } from '@jest/globals';
import { PostalCodeValidation } from '../postal-code-validation.js';

describe('postal code validation', () => {
  const TEST_VALUE = '08172';
  const ERROR_VALUE = '99999';
  const ERROR_SIZE_VALUE = '5000000';
  it('should return true for a valid postal code', () => {
    expect(PostalCodeValidation.isValidPostalCode(TEST_VALUE)).toBeTruthy();
  });

  it('should return false for an invalid postal code', () => {
    expect.assertions(2);
    expect(PostalCodeValidation.isValidPostalCode(ERROR_VALUE)).toBeFalsy();
    expect(PostalCodeValidation.isValidPostalCode(ERROR_SIZE_VALUE)).toBeFalsy();
  });
});
