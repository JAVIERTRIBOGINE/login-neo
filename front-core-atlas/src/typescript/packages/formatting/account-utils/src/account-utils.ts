const IBAN_BANK_INDEX = 4;
const IBAN_BRANCH_INDEX = 8;
const IBAN_CHECK_DIGIT_INDEX = 12;
const IBAN_ACCOUNT_INDEX = 14;

/**
 * Return Bank code from IBAN
 * @param iban Account IBAN to extract bank code
 * @returns bank code that represents bank entity
 */
export const getBankFromIBAN = (iban: string): string => {
  return iban.slice(IBAN_BANK_INDEX, IBAN_BRANCH_INDEX);
};

/**
 * Return Bank office from IBAN
 * @param iban Account IBAN to extract office code
 * @returns branch Office code from specific IBAN
 */
export const getBranchFromIBAN = (iban: string): string => {
  return iban.slice(IBAN_BRANCH_INDEX, IBAN_CHECK_DIGIT_INDEX);
};

/**
 * Return check digit from IBAN
 * @param iban Account IBAN to extract Check Digit
 * @returns checkDigit code from checksum account of IBAN
 */
export const getCheckDigitFromIBAN = (iban: string): string => {
  return iban.slice(IBAN_CHECK_DIGIT_INDEX, IBAN_ACCOUNT_INDEX);
};

/**
 * Return Account from specific IBAN
 * @param iban Account IBAN to extract account number
 * @returns account number of account from specific IBAN
 */
export const getAccountFromIBAN = (iban: string): string => {
  return iban.slice(IBAN_ACCOUNT_INDEX);
};
