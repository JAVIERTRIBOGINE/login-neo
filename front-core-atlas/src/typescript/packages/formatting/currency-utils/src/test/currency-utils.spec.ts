import { getCode, getSymbol } from '../currency-utils.js';

describe('currency-utils', () => {
  it('should return the currency symbol for an existent code', () => {
    expect(getSymbol('EUR')).toBe('€');
  });

  it('should return the currency code for an inexistent code', () => {
    expect(getSymbol('NON-EXISTING-CODE')).toBe('NON-EXISTING-CODE');
  });

  it('should return the ISO currency code for existing UTF-16 symbol', () => {
    expect(getCode('&#8364')).toBe('EUR');
  });

  it('should return the UTF-16 symbol for inexistent symbol', () => {
    expect(getCode('NON-EXISTING-SYMBOL')).toBe('NON-EXISTING-SYMBOL');
  });

  it('should return the currency code for an inexistent code that needs to be sanitized', () => {
    expect.assertions(1);
    expect(getSymbol('<iframe src="javascript:alert(document.cookie)"></iframe>NON-EXISTING-CODE')).toBe('NON-EXISTING-CODE');
  });

  it('should return the UTF-16 symbol for inexistent symbol that needs to be sanitized', () => {
    expect.assertions(1);
    expect(getCode('<iframe src="javascript:alert(document.cookie)"></iframe>NON-EXISTING-SYMBOL')).toBe('NON-EXISTING-SYMBOL');
  });
});
