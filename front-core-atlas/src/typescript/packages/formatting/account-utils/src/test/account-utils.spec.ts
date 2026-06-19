import { describe, expect, it } from '@jest/globals';
import { getAccountFromIBAN, getBankFromIBAN, getBranchFromIBAN, getCheckDigitFromIBAN } from '../account-utils.js';

describe('account-utils', () => {
  it('Should return Bank Code from IBAN', () => {
    expect(getBankFromIBAN('ES8304871971189761953363')).toBe('0487');
  });

  it('Should return Branck Code from IBAN', () => {
    expect(getBranchFromIBAN('ES8304871971189761953363')).toBe('1971');
  });

  it('Should return Check Digit Code from IBAN', () => {
    expect(getCheckDigitFromIBAN('ES8304871971189761953363')).toBe('18');
  });

  it('Should return Account Code from IBAN', () => {
    expect(getAccountFromIBAN('ES8304871971189761953363')).toBe('9761953363');
  });
});
