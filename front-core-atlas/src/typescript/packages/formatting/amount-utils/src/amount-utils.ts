import { getSymbol } from '@proteo/currency-utils';
import { I18n, I18nLangLoader, Languages } from '@proteo/i18n-utils';
import { LoggerUtils } from '@proteo/logger-utils';
import { sanitizeDOMString } from '@proteo/sanitization';
import type { AmountFormatOptions, AmountParseOptions, LanguageConfiguration } from '@proteo/types';

/**
 * Amount utils class for implementation of AmountUtils interface methods
 */
export class AmountUtils {
  /**
   * Singleton instance class
   */
  private static _instance: AmountUtils;

  /**
   * Currency language for formatting purposes. All amounts in Banc
   * Sabadell will be formatted as: #.###,### (catalan format)
   */
  private _language: LanguageConfiguration;

  /**
   * Constructor for class
   * @param conf Proteo Utils configuration
   */
  private constructor(conf?: LanguageConfiguration) {
    this._language = conf || Languages[new I18nLangLoader().loadLocale()];
    document.addEventListener(I18n.CHANGE_LANGUAGE_EVENT, (event) => {
      this._language = I18n.getInstance().getLanguageConfiguration((event as CustomEvent).detail);
    });
  }

  /**
   * Initialize the proteo amount utils with its configuration and saves it as singleton
   * @param conf the i18n configuration
   */
  public static initInstance(conf?: LanguageConfiguration): void {
    this._instance = new AmountUtils(conf);
  }

  /**
   * Returns the instance class of AmountUtils
   */
  public static getInstance(): AmountUtils {
    if (!AmountUtils._instance) {
      AmountUtils._instance = new AmountUtils();
    }
    return AmountUtils._instance;
  }

  /**
   * Parses string amount to number type with bank specifications for parsing
   *
   * @param amount String to parse
   * @param options Parse options
   * @returns {number} Formatted number
   */
  public parse(amount: string, options: AmountParseOptions = { language: this._language.currency }): number {
    const SAMPLE_GROUP_NUMBER = 11111;
    const SAMPLE_DECIMAL_NUMBER = 1.1;
    amount = this.validateString(amount);
    // Special case for valencian that should be like catalan
    if (options.language === Languages['va'].currency) {
      options.language = Languages['ca'].currency;
    }
    const group = new Intl.NumberFormat(options.language).format(SAMPLE_GROUP_NUMBER).replace(/1/g, '');
    const decimal = new Intl.NumberFormat(options.language).format(SAMPLE_DECIMAL_NUMBER).replace(/1/g, '');
    const reversed = amount.replace(new RegExp('\\' + group, 'g'), '').replace(new RegExp('\\' + decimal, 'g'), '.');
    return Number(reversed);
  }

  /**
   * Formats an amount number to formatted string with Bank formatting requisites
   *
   * @param amount Number to format
   * @param options Format options
   * @returns {string} Formatted and sanitized string
   */
  public format(amount: number, options: AmountFormatOptions = {}): string {
    this.fixOptionsLanguage(this._language.currency);
    const digits = options.decimalDigits === undefined ? this.countDecimalDigits(amount) : options.decimalDigits;
    amount = this.validateNumber(amount);
    let formattedNumber = this.getFormatter({
      decimalDigits: digits,
      currency: options.currency,
      staticFormattingLocale: options.staticFormattingLocale
    }).format(amount);
    formattedNumber = this.validateString(formattedNumber);
    if (options.currency) {
      formattedNumber = `${formattedNumber} ${getSymbol(options.currency)}`;
    }

    return sanitizeDOMString(formattedNumber);
  }

  /**
   * Returns the number of decimal digits (fraction part) for a concrete number
   *
   * @param amount Number to count the decimal part
   * @returns Number of decimal digits
   */
  private countDecimalDigits(amount: number): number {
    amount = this.validateNumber(amount);
    return (amount.toString().split('.')[1] || '').length;
  }

  /**
   * Returns the formatter for the parsing and format methods
   *
   * @param digits Number of digits for formatting
   * @returns Intl.NumberFormat formatter
   */
  private getFormatter(options: AmountFormatOptions) {
    const style: Intl.NumberFormatOptions = {
      minimumFractionDigits: options.decimalDigits,
      maximumFractionDigits: options.decimalDigits
    };
    if (options.staticFormattingLocale) {
      return new Intl.NumberFormat(options.staticFormattingLocale, style);
    }
    return new Intl.NumberFormat(this._language.currency, style);
  }

  /**
   * Validates if the type of the amount is correct. Returns 0 if no correct, the amount otherwise
   *
   * @param amount Number to validate
   * @returns Number or 0 is the type is not correct
   */
  private validateNumber(amount: number): number {
    if (
      typeof amount !== 'number' ||
      amount === undefined ||
      amount === null ||
      1 / amount === -Infinity ||
      isNaN(amount)
    ) {
      LoggerUtils.getInstance().warn(`the supplied number <${amount}> is not correct. Returning 0`, {
        remoteLogger: true,
        type: 'application'
      });
      return 0;
    }
    return amount;
  }

  /**
   * Validate if the parsed string has a correct format
   *
   * @param amount Number to validate
   * @returns The introduced amount or 0 if there is an error
   */
  private validateString(amount: string): string {
    if (typeof amount !== 'string' || amount === undefined || amount === null || 1 / Number(amount) === -Infinity) {
      LoggerUtils.getInstance().warn(`the supplied string <${amount}> is not correct. Returning 0`, {
        remoteLogger: true,
        type: 'application'
      });
      return '0';
    }
    return amount;
  }

  /**
   * Method that corrects the way amounts are formatted if the currency belongs to Spain.
   * The thousands separator format will be used
   *
   * @private
   * @param {string} [currency] Contains the Tag of the region of the chosen currency.
   */
  private fixOptionsLanguage(currency?: string): void {
    const localeTag = currency?.split('-')[1];
    if (localeTag === 'ES') {
      this._language.currency = Languages['ca'].currency;
    }
  }
}
