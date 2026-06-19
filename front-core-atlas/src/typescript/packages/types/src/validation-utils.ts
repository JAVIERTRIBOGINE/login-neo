/**
 * Date validation param
 */
export interface DateValidationParam {
  /**
   * Date to validate
   */
  date: string;
  /**
   * The earliest acceptable date
   */
  min?: string;
  /**
   * The latest acceptable date
   */
  max?: string;
}

/**
 * Date validation return
 */
export interface DateValidationReturn {
  /**
   * Whether the date is valid or not
   */
  isValid: boolean;

  /**
   * Result type of error or success
   */
  resultType: string;
}

/**
 * National document type
 */
export type DocumentIdentityType = 'dni' | 'nie' | 'cif';
