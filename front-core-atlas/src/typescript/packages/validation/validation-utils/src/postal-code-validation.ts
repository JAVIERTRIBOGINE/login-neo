import { SPANISH_POSTAL_CODE } from './constants.js';

export class PostalCodeValidation {
  /**
   * The function check Spanish postal code pattern
   * @param postalCode: postal code to validate
   */
  public static isValidPostalCode(postalCode: string): boolean {
    const regex = new RegExp(SPANISH_POSTAL_CODE); // CP number range between 01000 and 52999 (Spain)
    return regex.test(postalCode);
  }
}
