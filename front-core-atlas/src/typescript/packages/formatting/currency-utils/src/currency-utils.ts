import { sanitizeDOMString } from '@proteo/sanitization';
import { CURRENCY_CODES, CURRENCY_SYMBOLS } from './constants.js';

/**
 * Gives the specific character for every ISO code
 *
 * @param code ISO currency code (EUR for euro, USD for united states dollar)
 * @returns Sanitized string character representing the currency passed (€ for euro, $ for united states dollar)
 */
export const getSymbol = (code: string): string => {
  if (Object.keys(CURRENCY_SYMBOLS).includes(code)) {
    return CURRENCY_SYMBOLS[code];
  }
  return sanitizeDOMString(code);
};

/**
 * Returns the ISO currency code for a concrete UTF-16 symbol
 * @param symbol UTF-16 symbol (&#8364 for EUR)
 * @returns Sanitized string ISO currency code (EUR for euro, USD for united states dollar)
 */
export const getCode = (symbol: string): string => {
  if (Object.keys(CURRENCY_CODES).includes(symbol)) {
    return CURRENCY_CODES[symbol];
  }
  return sanitizeDOMString(symbol);
};
