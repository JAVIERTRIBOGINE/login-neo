import { describe, expect, it } from '@jest/globals';
import { aliasWithMaskAccountNumber } from '../obfuscation-utils';

const accountData = {
  aliasWithAccount: [
    { alias: 'abc', accountNumber: '1234567890' },
    { alias: 'xyx', accountNumber: '0987654321' }
  ]
};
describe('obfuscation-utils', () => {
  it('alias concat with masked account number', () => {
    expect(aliasWithMaskAccountNumber(accountData)).toStrictEqual(['abc ••••7890', 'xyx ••••4321']);
  });
});
