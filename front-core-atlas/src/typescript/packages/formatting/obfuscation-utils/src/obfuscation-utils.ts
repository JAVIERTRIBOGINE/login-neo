import type { AccountData } from '@proteo/types';

const LENGTH_TO_OBFUSCATE = 4;

/**
 * Creates a new URL by combining the specified URLs
 * @param baseURL The base URL
 * @param relativeURL The relative URL
 * @returns {string} The combined URL
 */
export function aliasWithMaskAccountNumber(aliasWithAccount: AccountData): string[] {
  return aliasWithAccount.aliasWithAccount.map(
    (accountData) =>
      accountData.alias +
      ' ••••' +
      accountData.accountNumber.substring(
        accountData.accountNumber.length - LENGTH_TO_OBFUSCATE,
        accountData.accountNumber.length
      )
  );
}
