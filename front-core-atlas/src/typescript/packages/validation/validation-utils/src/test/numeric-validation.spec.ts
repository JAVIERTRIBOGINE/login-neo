import { describe, expect, it } from '@jest/globals';
import { NumberValidation } from '../numeric-validation.js';

describe('number validation', () => {
  const TEST_VALUE = '1,23456';
  it('should return true for a valid number', () => {
    expect(NumberValidation.isValidNumber(TEST_VALUE)).toBeTruthy();
  });
});
