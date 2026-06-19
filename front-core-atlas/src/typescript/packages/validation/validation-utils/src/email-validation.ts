import { EMAIL_PATTERN } from './constants.js';

export class EmailValidation {
  /**
   * Check if the email match a valid pattern
   * E.g: some@some.some
   *
   * Rule validation pattern: https://www.regular-expressions.info/email.html
   * RFC 5322
   *
   * @param email: email to validate
   */
  public static isValidEmail(email: string): boolean {
    const regex = new RegExp(EMAIL_PATTERN, 'i');
    return regex.test(email);
  }
}
