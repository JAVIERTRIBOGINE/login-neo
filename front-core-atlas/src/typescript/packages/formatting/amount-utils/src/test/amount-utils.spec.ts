/* eslint-disable @typescript-eslint/no-loss-of-precision */
import { Languages } from '@proteo/i18n-utils';
import { AmountUtils } from '../amount-utils.js';

describe('amount-utils', () => {
  it('should format correct the amounts without format options', () => {
    const amount: AmountUtils = AmountUtils.getInstance();

    // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
    expect(amount.format(-12345678901234567)).toBe('-12,345,678,901,234,568');
    expect(amount.format(-1234567.89)).toBe('-1,234,567.89');
    expect(amount.format(-1234.567)).toBe('-1,234.567');
    expect(amount.format(-12.345)).toBe('-12.345');
    expect(amount.format(-12.345)).toBe('-12.345');
    expect(amount.format(-12.34)).toBe('-12.34');
    expect(amount.format(-12.03)).toBe('-12.03');
    expect(amount.format(-12.3)).toBe('-12.3');
    expect(amount.format(-12.0)).toBe('-12');
    expect(amount.format(-12)).toBe('-12');
    expect(amount.format(-1)).toBe('-1');
    expect(amount.format(-0.1)).toBe('-0.1');
    expect(amount.format(0)).toBe('0');
    expect(amount.format(0.1)).toBe('0.1');
    expect(amount.format(1)).toBe('1');
    expect(amount.format(12)).toBe('12');
    expect(amount.format(12.0)).toBe('12');
    expect(amount.format(12.3)).toBe('12.3');
    expect(amount.format(12.03)).toBe('12.03');
    expect(amount.format(12.34)).toBe('12.34');
    expect(amount.format(12.345)).toBe('12.345');
    expect(amount.format(1234.567)).toBe('1,234.567');
    expect(amount.format(1234567.89)).toBe('1,234,567.89');
    // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
    expect(amount.format(12345678901234567)).toBe('12,345,678,901,234,568');
  });

  it('should not fail on invalid inputs without format options', () => {
    AmountUtils.initInstance(Languages['ca']);
    const amount: AmountUtils = AmountUtils.getInstance();

    expect(amount.format(null as unknown as number)).toBe('0');
    expect(amount.format(undefined as unknown as number)).toBe('0');
    expect(amount.format('' as unknown as number)).toBe('0');
    expect(amount.format(NaN)).toBe('0');
  });

  it('should format correct the amounts with format options (currency)', () => {
    AmountUtils.initInstance(Languages['ca']);
    const amount: AmountUtils = AmountUtils.getInstance();

    expect(amount.format(1000, { currency: 'EUR' })).toBe('1.000 €');
    expect(amount.format(1000, { currency: 'USD' })).toBe('1.000 $');
    expect(amount.format(1000, { currency: 'INVALID' })).toBe('1.000 INVALID');

    expect(amount.format(null as unknown as number, { currency: 'EUR' })).toBe('0 €');
    expect(amount.format(undefined as unknown as number, { currency: 'EUR' })).toBe('0 €');
    expect(amount.format('' as unknown as number, { currency: 'EUR' })).toBe('0 €');
    expect(amount.format(NaN, { currency: 'EUR' })).toBe('0 €');
  });

  it('should format correct the amounts with format options (currency) Spanish', () => {
    AmountUtils.initInstance(Languages['es']);
    const amount: AmountUtils = AmountUtils.getInstance();

    expect(amount.format(1000, { currency: 'EUR' })).toBe('1.000 €');
    expect(amount.format(1000, { currency: 'USD' })).toBe('1.000 $');
    expect(amount.format(1000, { currency: 'INVALID' })).toBe('1.000 INVALID');

    expect(amount.format(null as unknown as number, { currency: 'EUR' })).toBe('0 €');
    expect(amount.format(undefined as unknown as number, { currency: 'EUR' })).toBe('0 €');
    expect(amount.format('' as unknown as number, { currency: 'EUR' })).toBe('0 €');
    expect(amount.format(NaN, { currency: 'EUR' })).toBe('0 €');
  });

  it('should format correct the amounts with Galician (currency) format options', () => {
    AmountUtils.initInstance(Languages['gl']);
    const amount: AmountUtils = AmountUtils.getInstance();

    expect(amount.format(1000, { currency: 'EUR' })).toBe('1.000 €');
    expect(amount.format(1000, { currency: 'USD' })).toBe('1.000 $');
    expect(amount.format(1000, { currency: 'INVALID' })).toBe('1.000 INVALID');

    expect(amount.format(null as unknown as number, { currency: 'EUR' })).toBe('0 €');
    expect(amount.format(undefined as unknown as number, { currency: 'EUR' })).toBe('0 €');
    expect(amount.format('' as unknown as number, { currency: 'EUR' })).toBe('0 €');
    expect(amount.format(NaN, { currency: 'EUR' })).toBe('0 €');
  });

  it('should format correct the amounts with format options (currency) Basque', () => {
    AmountUtils.initInstance(Languages['eu']);
    const amount: AmountUtils = AmountUtils.getInstance();

    expect(amount.format(1000, { currency: 'EUR' })).toBe('1.000 €');
    expect(amount.format(1000, { currency: 'USD' })).toBe('1.000 $');
    expect(amount.format(1000, { currency: 'INVALID' })).toBe('1.000 INVALID');

    expect(amount.format(null as unknown as number, { currency: 'EUR' })).toBe('0 €');
    expect(amount.format(undefined as unknown as number, { currency: 'EUR' })).toBe('0 €');
    expect(amount.format('' as unknown as number, { currency: 'EUR' })).toBe('0 €');
    expect(amount.format(NaN, { currency: 'EUR' })).toBe('0 €');
  });

  it('should format correct the amounts with format options (digits)', () => {
    AmountUtils.initInstance(Languages['ca']);
    const amount: AmountUtils = AmountUtils.getInstance();

    expect(amount.format(-12.99, { decimalDigits: 0 })).toBe('-13');
    expect(amount.format(-12.5, { decimalDigits: 0 })).toBe('-13');
    expect(amount.format(-12.49, { decimalDigits: 0 })).toBe('-12');
    expect(amount.format(-1.23, { decimalDigits: 0 })).toBe('-1');
    expect(amount.format(-1.0, { decimalDigits: 0 })).toBe('-1');
    expect(amount.format(-1, { decimalDigits: 0 })).toBe('-1');
    expect(amount.format(-0.99, { decimalDigits: 0 })).toBe('-1');
    expect(amount.format(-0.1, { decimalDigits: 0 })).toBe('0');
    expect(amount.format(0, { decimalDigits: 0 })).toBe('0');
    expect(amount.format(0.1, { decimalDigits: 0 })).toBe('0');
    expect(amount.format(0.99, { decimalDigits: 0 })).toBe('1');
    expect(amount.format(1, { decimalDigits: 0 })).toBe('1');
    expect(amount.format(1.0, { decimalDigits: 0 })).toBe('1');
    expect(amount.format(1.23, { decimalDigits: 0 })).toBe('1');
    expect(amount.format(12.49, { decimalDigits: 0 })).toBe('12');
    expect(amount.format(12.5, { decimalDigits: 0 })).toBe('13');
    expect(amount.format(12.99, { decimalDigits: 0 })).toBe('13');

    expect(amount.format(-12.99, { decimalDigits: 1 })).toBe('-13,0');
    expect(amount.format(-12.5, { decimalDigits: 1 })).toBe('-12,5');
    expect(amount.format(-12.49, { decimalDigits: 1 })).toBe('-12,5');
    expect(amount.format(-1.23, { decimalDigits: 1 })).toBe('-1,2');
    expect(amount.format(-1.0, { decimalDigits: 1 })).toBe('-1,0');
    expect(amount.format(-1, { decimalDigits: 1 })).toBe('-1,0');
    expect(amount.format(-0.1, { decimalDigits: 1 })).toBe('-0,1');
    expect(amount.format(0, { decimalDigits: 1 })).toBe('0,0');
    expect(amount.format(0.1, { decimalDigits: 1 })).toBe('0,1');
    expect(amount.format(1, { decimalDigits: 1 })).toBe('1,0');
    expect(amount.format(1.0, { decimalDigits: 1 })).toBe('1,0');
    expect(amount.format(1.23, { decimalDigits: 1 })).toBe('1,2');
    expect(amount.format(12.49, { decimalDigits: 1 })).toBe('12,5');
    expect(amount.format(12.5, { decimalDigits: 1 })).toBe('12,5');
    expect(amount.format(12.99, { decimalDigits: 1 })).toBe('13,0');

    expect(amount.format(-12.99, { decimalDigits: 2 })).toBe('-12,99');
    expect(amount.format(-12.5, { decimalDigits: 2 })).toBe('-12,50');
    expect(amount.format(-12.49, { decimalDigits: 2 })).toBe('-12,49');
    expect(amount.format(-1.23, { decimalDigits: 2 })).toBe('-1,23');
    expect(amount.format(-1.0, { decimalDigits: 2 })).toBe('-1,00');
    expect(amount.format(-1, { decimalDigits: 2 })).toBe('-1,00');
    expect(amount.format(-0.1, { decimalDigits: 2 })).toBe('-0,10');
    expect(amount.format(0, { decimalDigits: 2 })).toBe('0,00');
    expect(amount.format(0.1, { decimalDigits: 2 })).toBe('0,10');
    expect(amount.format(1, { decimalDigits: 2 })).toBe('1,00');
    expect(amount.format(1.0, { decimalDigits: 2 })).toBe('1,00');
    expect(amount.format(1.23, { decimalDigits: 2 })).toBe('1,23');
    expect(amount.format(12.49, { decimalDigits: 2 })).toBe('12,49');
    expect(amount.format(12.5, { decimalDigits: 2 })).toBe('12,50');
    expect(amount.format(12.99, { decimalDigits: 2 })).toBe('12,99');

    expect(amount.format(null as unknown as number, { decimalDigits: 2 })).toBe('0,00');
    expect(amount.format(undefined as unknown as number, { decimalDigits: 2 })).toBe('0,00');
    expect(amount.format('' as unknown as number, { decimalDigits: 2 })).toBe('0,00');
    expect(amount.format(NaN, { decimalDigits: 2 })).toBe('0,00');
  });

  it('should format correct the amounts with format options (currency and digits)', () => {
    AmountUtils.initInstance(Languages['ca']);
    const amount: AmountUtils = AmountUtils.getInstance();

    expect(amount.format(-12.99, { decimalDigits: 0, currency: 'EUR' })).toBe('-13 €');
    expect(amount.format(-12.5, { decimalDigits: 0, currency: 'EUR' })).toBe('-13 €');
    expect(amount.format(-12.49, { decimalDigits: 0, currency: 'EUR' })).toBe('-12 €');
    expect(amount.format(-1.23, { decimalDigits: 0, currency: 'EUR' })).toBe('-1 €');
    expect(amount.format(-1.0, { decimalDigits: 0, currency: 'EUR' })).toBe('-1 €');
    expect(amount.format(-1, { decimalDigits: 0, currency: 'EUR' })).toBe('-1 €');
    expect(amount.format(-0.1, { decimalDigits: 0, currency: 'EUR' })).toBe('0 €');
    expect(amount.format(0, { decimalDigits: 0, currency: 'EUR' })).toBe('0 €');
    expect(amount.format(0.1, { decimalDigits: 0, currency: 'EUR' })).toBe('0 €');
    expect(amount.format(1, { decimalDigits: 0, currency: 'EUR' })).toBe('1 €');
    expect(amount.format(1.0, { decimalDigits: 0, currency: 'EUR' })).toBe('1 €');
    expect(amount.format(1.23, { decimalDigits: 0, currency: 'EUR' })).toBe('1 €');
    expect(amount.format(12.49, { decimalDigits: 0, currency: 'EUR' })).toBe('12 €');
    expect(amount.format(12.5, { decimalDigits: 0, currency: 'EUR' })).toBe('13 €');
    expect(amount.format(12.99, { decimalDigits: 0, currency: 'EUR' })).toBe('13 €');

    expect(amount.format(-12.99, { decimalDigits: 1, currency: 'EUR' })).toBe('-13,0 €');
    expect(amount.format(-12.5, { decimalDigits: 1, currency: 'EUR' })).toBe('-12,5 €');
    expect(amount.format(-12.49, { decimalDigits: 1, currency: 'EUR' })).toBe('-12,5 €');
    expect(amount.format(-1.23, { decimalDigits: 1, currency: 'EUR' })).toBe('-1,2 €');
    expect(amount.format(-1.0, { decimalDigits: 1, currency: 'EUR' })).toBe('-1,0 €');
    expect(amount.format(-1, { decimalDigits: 1, currency: 'EUR' })).toBe('-1,0 €');
    expect(amount.format(-0.1, { decimalDigits: 1, currency: 'EUR' })).toBe('-0,1 €');
    expect(amount.format(0, { decimalDigits: 1, currency: 'EUR' })).toBe('0,0 €');
    expect(amount.format(0.1, { decimalDigits: 1, currency: 'EUR' })).toBe('0,1 €');
    expect(amount.format(1, { decimalDigits: 1, currency: 'EUR' })).toBe('1,0 €');
    expect(amount.format(1.0, { decimalDigits: 1, currency: 'EUR' })).toBe('1,0 €');
    expect(amount.format(1.23, { decimalDigits: 1, currency: 'EUR' })).toBe('1,2 €');
    expect(amount.format(12.49, { decimalDigits: 1, currency: 'EUR' })).toBe('12,5 €');
    expect(amount.format(12.5, { decimalDigits: 1, currency: 'EUR' })).toBe('12,5 €');
    expect(amount.format(12.99, { decimalDigits: 1, currency: 'EUR' })).toBe('13,0 €');

    expect(amount.format(-12.99, { decimalDigits: 2, currency: 'EUR' })).toBe('-12,99 €');
    expect(amount.format(-12.5, { decimalDigits: 2, currency: 'EUR' })).toBe('-12,50 €');
    expect(amount.format(-12.49, { decimalDigits: 2, currency: 'EUR' })).toBe('-12,49 €');
    expect(amount.format(-1.23, { decimalDigits: 2, currency: 'EUR' })).toBe('-1,23 €');
    expect(amount.format(-1.0, { decimalDigits: 2, currency: 'EUR' })).toBe('-1,00 €');
    expect(amount.format(-1, { decimalDigits: 2, currency: 'EUR' })).toBe('-1,00 €');
    expect(amount.format(-0.1, { decimalDigits: 2, currency: 'EUR' })).toBe('-0,10 €');
    expect(amount.format(0, { decimalDigits: 2, currency: 'EUR' })).toBe('0,00 €');
    expect(amount.format(0.1, { decimalDigits: 2, currency: 'EUR' })).toBe('0,10 €');
    expect(amount.format(1, { decimalDigits: 2, currency: 'EUR' })).toBe('1,00 €');
    expect(amount.format(1.0, { decimalDigits: 2, currency: 'EUR' })).toBe('1,00 €');
    expect(amount.format(1.23, { decimalDigits: 2, currency: 'EUR' })).toBe('1,23 €');
    expect(amount.format(12.49, { decimalDigits: 2, currency: 'EUR' })).toBe('12,49 €');
    expect(amount.format(12.5, { decimalDigits: 2, currency: 'EUR' })).toBe('12,50 €');
    expect(amount.format(12.99, { decimalDigits: 2, currency: 'EUR' })).toBe('12,99 €');

    expect(amount.format(null as unknown as number, { decimalDigits: 2, currency: 'EUR' })).toBe('0,00 €');
    expect(amount.format(undefined as unknown as number, { decimalDigits: 2, currency: 'EUR' })).toBe('0,00 €');
    expect(amount.format('' as unknown as number, { decimalDigits: 2, currency: 'EUR' })).toBe('0,00 €');
    expect(amount.format(NaN, { decimalDigits: 2, currency: 'EUR' })).toBe('0,00 €');
  });

  it('should parse correct the amounts without parse options', () => {
    AmountUtils.initInstance(Languages['ca']);
    const amount: AmountUtils = AmountUtils.getInstance();

    // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
    expect(amount.parse('-12.345.678.901.234.568')).toBe(-12345678901234567);
    expect(amount.parse('-1.234.567,89')).toBe(-1234567.89);
    expect(amount.parse('-1.234,567')).toBe(-1234.567);
    expect(amount.parse('-12,345')).toBe(-12.345);
    expect(amount.parse('-12,345')).toBe(-12.345);
    expect(amount.parse('-12,34')).toBe(-12.34);
    expect(amount.parse('-12,03')).toBe(-12.03);
    expect(amount.parse('-12,3')).toBe(-12.3);
    expect(amount.parse('-12')).toBe(-12.0);
    expect(amount.parse('-12')).toBe(-12);
    expect(amount.parse('-1')).toBe(-1);
    expect(amount.parse('-0,1')).toBe(-0.1);
    expect(amount.parse('0')).toBe(0);
    expect(amount.parse('0,1')).toBe(0.1);
    expect(amount.parse('1')).toBe(1);
    expect(amount.parse('12')).toBe(12);
    expect(amount.parse('12')).toBe(12.0);
    expect(amount.parse('12,3')).toBe(12.3);
    expect(amount.parse('12,03')).toBe(12.03);
    expect(amount.parse('12,34')).toBe(12.34);
    expect(amount.parse('12,345')).toBe(12.345);
    expect(amount.parse('1.234,567')).toBe(1234.567);
    expect(amount.parse('1.234.567,89')).toBe(1234567.89);
    // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
    expect(amount.parse('12.345.678.901.234.568')).toBe(12345678901234567);

    expect(amount.parse(null as unknown as string)).toBe(0);
    expect(amount.parse(undefined as unknown as string)).toBe(0);
    expect(amount.parse('')).toBe(0);
    expect(amount.parse(0 as unknown as string)).toBe(0);
  });

  it('should parse correct the amounts with parse options', () => {
    AmountUtils.initInstance(Languages['ca']);
    const amount: AmountUtils = AmountUtils.getInstance();

    expect(amount.parse('1000', { language: 'ca-ES' })).toBe(1000);
    expect(amount.parse('1000', { language: 'de-DE' })).toBe(1000);
    expect(amount.parse('1000', { language: 'en-GB' })).toBe(1000);
    expect(amount.parse('1000', { language: 'es-ES' })).toBe(1000);
    expect(amount.parse('1000', { language: 'eu-ES' })).toBe(1000);
    expect(amount.parse('1000', { language: 'fr-FR' })).toBe(1000);
    expect(amount.parse('1000', { language: 'gl-ES' })).toBe(1000);
    expect(amount.parse('1000', { language: 'va-ES' })).toBe(1000);

    expect(amount.parse('1.000', { language: 'ca-ES' })).toBe(1000);
    expect(amount.parse('1.000', { language: 'de-DE' })).toBe(1000);
    expect(amount.parse('1,000', { language: 'en-GB' })).toBe(1000);
    expect(amount.parse('1.000', { language: 'es-ES' })).toBe(1000);
    expect(amount.parse('1.000', { language: 'eu-ES' })).toBe(1000);
    expect(amount.parse('1 000', { language: 'fr-FR' })).toBe(1000);
    expect(amount.parse('1.000', { language: 'gl-ES' })).toBe(1000);
    expect(amount.parse('1.000', { language: 'va-ES' })).toBe(1000);

    expect(amount.parse('1.000,12', { language: 'ca-ES' })).toBe(1000.12);
    expect(amount.parse('1.000,12', { language: 'de-DE' })).toBe(1000.12);
    expect(amount.parse('1,000.12', { language: 'en-GB' })).toBe(1000.12);
    expect(amount.parse('1.000,12', { language: 'es-ES' })).toBe(1000.12);
    expect(amount.parse('1.000,12', { language: 'eu-ES' })).toBe(1000.12);
    expect(amount.parse('1 000,12', { language: 'fr-FR' })).toBe(1000.12);
    expect(amount.parse('1.000,12', { language: 'gl-ES' })).toBe(1000.12);
    expect(amount.parse('1.000,12', { language: 'va-ES' })).toBe(1000.12);
  });

  it('should sanitize the incoming value and returning 0', () => {
    expect.assertions(1);
    const amount: AmountUtils = AmountUtils.getInstance();

    expect(amount.format('<script>document.cookie</script>' as unknown as number)).toBe('0');
  });
});
