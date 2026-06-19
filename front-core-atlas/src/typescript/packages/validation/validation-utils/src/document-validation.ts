import type { DocumentIdentityType } from '@proteo/types';

export class DocumentValidation {
  /**
   * DNI valid letters
   */
  private static readonly DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
  /**
   * DNI regular expression
   */
  private static readonly DNI_REGEX = new RegExp(`^(\\d{8})([${DocumentValidation.DNI_LETTERS}])$`);
  /**
   * CIF regular expression
   */
  private static readonly CIF_REGEX = new RegExp('^([ABCDEFGHJKLMNPQRSUVW])(\\d{7})([0-9A-J])$');
  /**
   * NIE regular expression
   */
  private static readonly NIE_REGEX = new RegExp(`^[XYZ]\\d{7,8}[${DocumentValidation.DNI_LETTERS}]$`);

  /**
   * Check the document REGEXP patterns to select the validation kind.
   * Returns the validation selected
   *
   * @param str: Document to check
   */
  public static getDocTypeValidation(
    str: string,
    validationTypes?: DocumentIdentityType[]
  ): DocumentIdentityType | string {
    let validation: DocumentIdentityType = 'dni';
    let result = '';
    if (str.match(DocumentValidation.DNI_REGEX)) {
      validation = result = 'dni';
    } else if (str.match(DocumentValidation.NIE_REGEX)) {
      validation = result = 'nie';
    } else if (str.match(DocumentValidation.CIF_REGEX)) {
      validation = result = 'cif';
    }

    if (validationTypes) {
      return validationTypes.includes(validation) ? result : '';
    } else {
      return result;
    }
  }

  /**
   * Verify if the DNI letter is related to the DNI number
   *
   * @param dni: DNI string
   */
  public static isValidDNI(dni: string): boolean {
    const LETTER_FILTER = 23;
    const LETTER_POS = 8;
    const dniLetters = DocumentValidation.DNI_LETTERS;
    const letter = dniLetters.charAt(parseInt(dni, 10) % LETTER_FILTER);

    return letter === dni.charAt(LETTER_POS);
  }

  /**
   * Verify if the NIE letter is related to the NIE number and if the initial character is a letter to check. In this case is replaced to the constant number
   * X = 0
   * Y = 1
   * Z = 2
   *
   * @param nie : NIE string
   */
  public static isValidNIE(nie: string): boolean {
    // Change the initial letter for the corresponding number and validate as DNI
    const NIE_PREFIX_X = 0;
    const NIE_PREFIX_Y = 1;
    const NIE_PREFIX_Z = 2;
    let niePrefix: number = +nie.charAt(0);

    switch (nie.charAt(0)) {
      case 'X':
        niePrefix = NIE_PREFIX_X;
        break;
      case 'Y':
        niePrefix = NIE_PREFIX_Y;
        break;
      case 'Z':
        niePrefix = NIE_PREFIX_Z;
        break;
    }
    return DocumentValidation.isValidDNI(`${niePrefix}${nie.substr(1)}`);
  }

  /**
   * Verify the CIF format
   *
   *
   * @param cif: CIF string
   */
  public static isValidCIF(cif: string): boolean {
    const match = cif.match(DocumentValidation.CIF_REGEX);
    const LETTER_MATCH_INDEX = 1;
    const NUMBER_MATCH_INDEX = 2;
    const CONTROL_MATCH_INDEX = 3;
    if (match) {
      const letter = match[LETTER_MATCH_INDEX],
        number = match[NUMBER_MATCH_INDEX],
        control = match[CONTROL_MATCH_INDEX];

      const { controlDigitString, controlLetter } = this.calculateControl(number);

      if (letter) {
        // Control must be a digit
        if (letter.match(/[ABEH]/)) {
          return control === controlDigitString;
        }
        // Control must be a letter
        if (letter.match(/[KPQS]/)) {
          return control === controlLetter;
        }
      }
      // Can be either
      return control === controlDigitString || control === controlLetter;
    }
    return false;
  }

  private static readonly MULTIPLIER = 2;
  private static readonly ADJUSTMENT_THRESHOLD = 10;
  private static readonly ADJUSTMENT_VALUE = 9;
  private static readonly CONTROL_DIGIT_BASE = 10;

  private static calculateControl(number: string | null): { controlDigitString: string; controlLetter: string } {
    let evenSum = 0;
    let oddSum = 0;
    let n: number;
    if (number) {
      for (let i = 0; i < number.length; i++) {
        n = parseInt(number[i], this.ADJUSTMENT_THRESHOLD);

        // Odd positions (Even index equals to odd position. i=0 equals first position)
        if (i % this.MULTIPLIER === 0) {
          // Odd positions are multiplied first.
          n *= this.MULTIPLIER;

          // If the multiplication is bigger than 10 we need to adjust
          oddSum += n < this.ADJUSTMENT_THRESHOLD ? n : n - this.ADJUSTMENT_VALUE;

          // Even positions
          // Just sum them
        } else {
          evenSum += n;
        }
      }
    }

    const controlDigit = (this.CONTROL_DIGIT_BASE - ((evenSum + oddSum).toString().substr(-1) as unknown as number))
      .toString()
      .substr(-1) as unknown as number;
    const controlDigitString = controlDigit.toString();
    const controlLetter = 'JABCDEFGHI'.substr(controlDigit, 1);

    return { controlDigitString, controlLetter };
  }

  /**
   * The function check Spanish Document identification types. Find the correct pattern associated to every document
   * and returns the validity check
   * @param value: Document to validate
   */
  public static isValidDocument(document: string, validationTypes?: DocumentIdentityType[]): boolean {
    const str = document.toString().toUpperCase();

    let isValid = false;
    const typeValidation = DocumentValidation.getDocTypeValidation(str, validationTypes);

    if (!typeValidation) return isValid;

    switch (typeValidation) {
      case 'dni':
        isValid = DocumentValidation.isValidDNI(str);
        break;
      case 'nie':
        isValid = DocumentValidation.isValidNIE(str);
        break;
      case 'cif':
        isValid = DocumentValidation.isValidCIF(str);
        break;
    }

    return isValid;
  }
}
