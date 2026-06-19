import { FOREIGN_PHONE_PATTERN, SPANISH_PHONE_PATTERN } from './constants.js';

export class PhoneNumberValidation {
  /**
   * The function check Spanish phone numbers pattern
   * @param phoneNumber: phone number to validate
   * @param phonePrefix: phone prefix to determine validation
   */
  public static isValidPhoneNumber(phoneNumber: string, phonePrefix?: string): boolean {
    const number = phoneNumber.replace(/\s+/g, '');
    let regex;
    if (phonePrefix && phonePrefix !== '+34') {
      regex = new RegExp(FOREIGN_PHONE_PATTERN); // Phone Number only containing digits
    } else {
      regex = new RegExp(SPANISH_PHONE_PATTERN); // Phone Number starting with the digits 6,7,8 or 9 and nine digits in total (Spain)
    }
    return regex.test(number);
  }
}
