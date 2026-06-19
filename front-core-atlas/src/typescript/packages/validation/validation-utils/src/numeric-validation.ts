import { NUMERIC_PATTERN } from './constants.js';

export class NumberValidation {
  /**
   * Check if the number match a valid pattern
   * - number up to 5 decimal positions
   *
   * @param value: number to validate
   */
  public static isValidNumber(value: string): boolean {
    const regex = new RegExp(NUMERIC_PATTERN);
    return regex.test(value);
  }
}
