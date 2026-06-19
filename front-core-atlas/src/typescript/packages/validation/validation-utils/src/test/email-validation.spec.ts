import { describe, expect, it } from '@jest/globals';
import { EmailValidation } from '../email-validation.js';

describe('email-validation', () => {
  it('should return true for a valid Email', () => {
    expect(EmailValidation.isValidEmail('test@test.com')).toBeTruthy();
    expect(EmailValidation.isValidEmail('admin@192.168.16.24')).toBeTruthy();
    expect(EmailValidation.isValidEmail('admin@[192.168.0.1]')).toBeTruthy();
    expect(EmailValidation.isValidEmail('"john..doe"@example.org')).toBeTruthy();
    expect(EmailValidation.isValidEmail('"john@doe"@example.org')).toBeTruthy();
    expect(EmailValidation.isValidEmail('john.doe+123@example.server.org')).toBeTruthy();
    expect(EmailValidation.isValidEmail('john.doe#123@example.org')).toBeTruthy();
    expect(EmailValidation.isValidEmail('"john.doe@123"@example.org')).toBeTruthy();
    expect(EmailValidation.isValidEmail('admin@exa-mple.com')).toBeTruthy();
  });

  it('should return false for an invalid Email', () => {
    // TODO: Review the Pattern to check the difference between Wikipedia premises and Mozilla/Regular-expressions,info patterns
    expect(EmailValidation.isValidEmail('admin@mailserver1')).toBeFalsy();
    expect(EmailValidation.isValidEmail('" "@example.org')).toBeFalsy();
    //
    expect(EmailValidation.isValidEmail('test')).toBeFalsy();
    expect(EmailValidation.isValidEmail('A@b@c@example.com')).toBeFalsy();
    expect(EmailValidation.isValidEmail('a"b(c)d,e:f;g<h>i[jk]l@example.com')).toBeFalsy();
    expect(EmailValidation.isValidEmail('just"not"right@example.com')).toBeFalsy();
    expect(EmailValidation.isValidEmail('this is"notallowed@example.com')).toBeFalsy();
    expect(EmailValidation.isValidEmail('this still"notallowed@example.com')).toBeFalsy();
    expect(EmailValidation.isValidEmail('admin@192.168.0.1]')).toBeFalsy();
    expect(EmailValidation.isValidEmail('admin@[366.168.0.1]')).toBeFalsy();
    expect(EmailValidation.isValidEmail('admin@[192.168.0.0.1]')).toBeFalsy();
    expect(EmailValidation.isValidEmail('admin@[a.168.0.1]')).toBeFalsy();
    expect(EmailValidation.isValidEmail('admin@[not.allowed]')).toBeFalsy();
    expect(EmailValidation.isValidEmail('admin@-example.com')).toBeFalsy();
    expect(EmailValidation.isValidEmail('admin@exa#mple.com')).toBeFalsy();
    expect(EmailValidation.isValidEmail('admin@example-.com')).toBeFalsy();
    expect(EmailValidation.isValidEmail('admin@example$.com')).toBeFalsy();
    expect(EmailValidation.isValidEmail('john..doe@example..com')).toBeFalsy();
    expect(EmailValidation.isValidEmail('john.doe@example..com')).toBeFalsy();
    expect(EmailValidation.isValidEmail('john..doe@example.com')).toBeFalsy();
  });
});
