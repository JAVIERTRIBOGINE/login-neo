/**
 * Options for date parsing
 */
export interface DateParseOptions {
  /**
   * Date format
   */
  format?: string;
}

/**
 * Options for date formatting
 */
export interface DateFormatOptions {
  /**
   * Date format
   */
  format?: string;
}

/**
 * Dates format for the formatDate method
 */
export interface DateFormatConf {
  /**
   * Date format of the current year
   */
  currentYearFormat: string;

  /**
   * Date format of the not current years
   */
  otherYearFormat: string;
}

/**
 * Day width type
 */
export type dayWidth = 'narrow' | 'short' | 'abbreviated';

/**
 * Set values interface
 */
export interface SetValues {
  /**
   * the number of years to be set
   */
  year?: number;

  /**
   * the number of months to be set
   */
  month?: number;

  /**
   * the number of days to be set
   */
  date?: number;

  /**
   * the number of hours to be set
   */
  hours?: number;

  /**
   * the number of minutes to be set
   */
  minutes?: number;

  /**
   * the number of seconds to be set
   */
  seconds?: number;

  /**
   * the number of milliseconds to be set
   */
  milliseconds?: number;
}
