import { describe, expect, it } from '@jest/globals';
import { isValidPassword } from '../password-validation.js';

describe('password-validation', () => {
  it('should return true for a valid password', () => {
    expect(isValidPassword('Pass.wo1')).toBeTruthy();
    expect(isValidPassword('World!1?')).toBeTruthy();
  });

  it('should return false for an invalid password', () => {
    expect(isValidPassword('pass')).toBeFalsy();
    expect(isValidPassword('password')).toBeFalsy();
    expect(isValidPassword('passwor1')).toBeFalsy();
    expect(isValidPassword('passwo.1')).toBeFalsy();
    expect(isValidPassword('Passwor1')).toBeFalsy();
  });
});
