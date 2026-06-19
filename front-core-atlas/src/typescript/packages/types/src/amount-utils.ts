/**
 * Options for amount formatting
 */
export interface AmountFormatOptions {
  /**
   * Number of decimal digits for amount formatting
   */
  decimalDigits?: number;

  /**
   * The currency to use in currency formatting. Possible values
   * are the ISO 4217 currency codes, such as "USD" for the US
   * dollar, "EUR" for the euro, or "CNY" for the Chinese RMB
   */
  currency?: string;

  /**
   * Applies static formatting to a given locale if set. Expected format example: 'es-ES'
   */
  staticFormattingLocale?: string;
}

/**
 * Options for amount parsing
 */
export interface AmountParseOptions {
  /**
   * A string with a BCP 47 language tag, or an array of such strings
   */
  language?: string;
}
