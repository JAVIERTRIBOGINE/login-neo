import { I18n, I18nLangLoader, Languages } from '@proteo/i18n-utils';
import { LoggerUtils } from '@proteo/logger-utils';
import type {
  DateFormatConf,
  DateFormatOptions,
  DateParseOptions,
  dayWidth,
  LanguageConfiguration,
  SetValues
} from '@proteo/types';
import {
  compareAsc,
  compareDesc,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDate,
  getDay,
  getMonth,
  getWeekOfMonth,
  getWeeksInMonth,
  getYear,
  type Interval,
  isAfter,
  isBefore,
  isEqual,
  isSameDay,
  isSameMonth,
  isSameYear,
  isToday,
  isValid,
  isYesterday,
  parse,
  set,
  startOfMonth,
  add,
  sub
} from 'date-fns';
import { DAYS_OF_WEEK } from './constants.js';

/**
 * Platform utils class for implementation of PlatformUtils interface methods
 */
export class DateUtils {
  /**
   * Singleton instance class
   */
  private static _instance: DateUtils;

  /**
   * Currency language for formatting purposes. All amounts in Banc
   * Sabadell will be formatted as: #.###,### (catalan format)
   */
  private _language: LanguageConfiguration;

  /**
   * Default date format
   */
  private readonly DEFAULT_FORMAT = 'dd/MM/yyyy';

  /**
   * Constructor for class
   * @param conf Proteo Utils configuration
   */
  private constructor(conf?: LanguageConfiguration) {
    this._language = conf || Languages[new I18nLangLoader().loadLocale()];
    this.onLanguageChange = this.onLanguageChange.bind(this);
    document.addEventListener(I18n.CHANGE_LANGUAGE_EVENT, this.onLanguageChange);
  }

  /**
   * Initialize the proteo date utils with its configuration and saves it as singleton
   * @param conf the i18n configuration
   */
  public static async initInstance(conf?: LanguageConfiguration): Promise<void> {
    if (conf) {
      DateUtils._instance = new DateUtils(conf);
    } else if (!DateUtils._instance) {
      DateUtils._instance = new DateUtils();
    }
    await this._instance.resolveLocales();
  }

  /**
   * Returns the instance class of PlatformUtils
   */
  public static getInstance(): DateUtils {
    if (!DateUtils._instance) {
      this.initInstance();
    }
    return DateUtils._instance;
  }

  private async onLanguageChange(event: Event) {
    this._language = I18n.getInstance().getLanguageConfiguration((event as CustomEvent).detail);
    await this.resolveLocales();
  }

  private async resolveLocales() {
    if (typeof this._language.date === 'function') {
      this._language.date = await this._language.date();
    }
  }

  /**
   * Returns a javascript date from a input string
   * @param date String date to parse
   * @param options Date parse Options
   */
  public parse(date: string, options: DateParseOptions = { format: this.DEFAULT_FORMAT }): Date {
    let parsedDate;
    if (options?.format) {
      if (typeof this._language.date !== 'function' && this._language.date?.match) {
        parsedDate = parse(date, options.format, new Date(), { locale: this._language.date });
      } else {
        parsedDate = new Date();
      }
      return parsedDate;
    } else {
      LoggerUtils.getInstance().error('[Date Utils] [parse] Format is not defined', {
        remoteLogger: true,
        type: 'application'
      });
      throw new Error('[date-utils] format is not defined');
    }
  }

  /**
   * Returns a string date from an input Date
   * @param date Javascript Date to format
   * @param options Date format options
   */
  public format(date: Date, options: DateFormatOptions = { format: this.DEFAULT_FORMAT }): string {
    let formattedDate;
    if (options?.format) {
      if (typeof this._language.date !== 'function' && this._language.date?.localize) {
        formattedDate = format(date, options.format, { locale: this._language.date });
      } else {
        formattedDate = '';
      }
      return formattedDate;
    } else {
      LoggerUtils.getInstance().error('[Date Utils] [format] Format is not defined', {
        remoteLogger: true,
        type: 'application'
      });
      throw new Error('[date-utils] format is not defined');
    }
  }

  /**
   * Sets date utils component
   * @param date: the date to change
   * @param values: object with options
   * @returns the new date with options set
   */
  public set(date: Date, values: SetValues): Date {
    return set(date, values);
  }

  /**
   * Get the day name with the locale selected
   *
   * @param date: The date to extract the day
   */
  public getDayName(date: Date): string {
    if (typeof this._language.date !== 'function' && this._language.date?.localize) {
      return this._language.date.localize?.day(getDay(date));
    }
    return '';
  }

  /**
   * Get the month name with the locale selected
   *
   * @param date: The date to extract the month
   */
  public getMonthNameFromDate(date: Date): string {
    if (typeof this._language.date !== 'function' && this._language.date?.localize) {
      return this._language.date.localize?.month(getMonth(date));
    }
    return '';
  }

  /**
   * Get the month name with the locale selected
   *
   * @param index: the index of the month (0...11)
   */
  public getMonthNameFromIndex(index: number): string {
    if (typeof this._language.date !== 'function' && this._language.date?.localize) {
      return this._language.date.localize?.month(index);
    }
    return '';
  }

  /**
   * Get the date and returns a formatted date
   * i.e.: '01' for 1st day of the month
   *
   * @param date: The date to extract the date
   */
  public getTwoDigitsDate(date: Date): string {
    const DESIRED_LENGTH = 2;
    return getDate(date).toString().padStart(DESIRED_LENGTH, '0');
  }

  /**
   * Get the month
   *
   * @param date: The date to extract the month
   */
  public getMonth(date: Date): number {
    return getMonth(date);
  }

  /**
   * Get the full year
   *
   * @param date: The date to extract the year
   */
  public getYear(date: Date): number {
    return getYear(date);
  }

  /**
   * Get the day of the week of the given date.
   *
   * @param date: The date to extract the day number
   */
  public getDayNumberIntoTheWeek(date: Date): number {
    return getDay(date);
  }

  /**
   * Return an array of seven elements with the day names of a week
   * @param width: the format of the day, if no width specificated the days will have the full format.
   */
  public getDaysOfAWeek(width?: dayWidth): string[] {
    return [...Array(DAYS_OF_WEEK).keys()].map((i) => {
      if (typeof this._language.date !== 'function' && this._language.date?.localize) {
        return this._language.date.localize?.day(i, width && { width });
      }
      return '';
    });
  }

  /**
   * Get the time zone
   */
  public getTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  /**
   * Returns a matrix with the weeks and the days of every week ordered
   *
   * Example:
   * [
   *  week 0 : [
   *  Day 1,
   *  Day 2]
   *  week 1 : []
   * ]
   *
   * Real example:
   * [[Day1,Day2,Day3,Day4,Day5],
   *  [Day1,Day2,Day3,Day4,Day5,Day6,Day7],
   *  [Day1,Day2,Day3,Day4,Day5,Day6,Day7],
   *  [Day1,Day2,Day3,Day4,Day5,Day6,Day7]
   * ]
   *
   * @param date: The date to extract the month
   */
  public getDaysOfMonth(date: Date): unknown[] {
    const matrix: Date[][] = Array(getWeeksInMonth(date)).fill(null);
    const interval: Interval = {
      start: startOfMonth(date),
      end: endOfMonth(date)
    };
    const days = eachDayOfInterval(interval);

    days.forEach((day: Date) => {
      const weekDayNumber = getWeekOfMonth(day) - 1;
      !matrix[weekDayNumber] && (matrix[weekDayNumber] = []);
      matrix[weekDayNumber].push(day);
    });

    return matrix;
  }

  /**
   * Check if the date is a valid date
   * @param date : Date to valid
   */
  public isValid(date: Date): boolean {
    return isValid(date);
  }

  /**
   * Is the first date after the second one?
   *
   * @param leftDate: Date
   * @param rightDate: Date
   */
  public isAfter(leftDate: Date, rightDate: Date): boolean {
    return isAfter(leftDate, rightDate);
  }

  /**
   * Is the first date before the second one?
   *
   * @param leftDate: Date
   * @param rightDate: Date
   */
  public isBefore(leftDate: Date, rightDate: Date): boolean {
    return isBefore(leftDate, rightDate);
  }

  /**
   * Are the given dates in the same day?
   *
   * @param leftDate: Date
   * @param rightDate: Date
   */
  public isSameDay(leftDate: Date, rightDate: Date): boolean {
    return isSameDay(leftDate, rightDate);
  }

  /**
   * Are the given dates in the same month?
   *
   * @param leftDate: Date
   * @param rightDate: Date
   */
  public isSameMonth(leftDate: Date, rightDate: Date): boolean {
    return isSameMonth(leftDate, rightDate);
  }

  /**
   * Are the given dates in the same year?
   *
   * @param leftDate: Date
   * @param rightDate: Date
   */
  public isSameYear(leftDate: Date, rightDate: Date): boolean {
    return isSameYear(leftDate, rightDate);
  }

  /**
   * Are the given dates equals?
   *
   * @param leftDate: Date
   * @param rightDate: Date
   */
  public isEqual(leftDate: Date, rightDate: Date): boolean {
    return isEqual(leftDate, rightDate);
  }

  /**
   * Is the given date today?
   *
   * @param date: Date
   */
  public isToday(date: Date): boolean {
    return isToday(date);
  }

  /**
   * Is the given date yesterday?
   *
   * @param date: Date
   */
  public isYesterday(date: Date): boolean {
    return isYesterday(date);
  }

  /**
   * Compare the two dates and return
   * 1 if the first date is after the second,
   * -1 if the first date is before the second
   * 0 if dates are equal
   *
   * @param leftDate: the first date to compare
   * @param rightDate: the second date to compare
   */
  public compareAsc(leftDate: Date, rightDate: Date): number {
    return compareAsc(leftDate, rightDate);
  }

  /**
   * Compare the two dates and return
   * -1 if the first date is after the second,
   * 1 if the first date is before the second or
   * 0 if dates are equal.
   *
   * @param leftDate: the first date to compare
   * @param rightDate: the second date to compare
   */
  public compareDesc(leftDate: Date, rightDate: Date): number {
    return compareDesc(leftDate, rightDate);
  }

  /**
   * Function to format the date and display the correct literal if the date is today or yesterday
   * The current year and the other years can have two different formats which must be specificated in a DatesFormatConf object
   *
   * @param date: date
   * @param formatConf: DatesFormatConf object that specifies 2 formats:
   * the format of the current year and the format of the not current years
   * @returns {string} the formatted date to display
   */
  public formatDate(date: string, formatConf: DateFormatConf): string {
    const parsedDate = this.parse(date);
    let dateToDisplay = this.format(parsedDate, { format: formatConf.currentYearFormat });
    if (this.isToday(parsedDate)) {
      dateToDisplay = I18n.getInstance().t('PROTEO4_COMMON:DATE.TODAY');
    } else if (this.isYesterday(parsedDate)) {
      dateToDisplay = I18n.getInstance().t('PROTEO4_COMMON:DATE.YESTERDAY');
    } else if (!this.isSameYear(parsedDate, new Date())) {
      dateToDisplay = this.format(parsedDate, { format: formatConf.otherYearFormat });
    }
    return dateToDisplay;
  }

  /**
   * Adds the specified amount of time to the given date.
   * @param date - The date to which time will be added.
   * @param amount - An object that specifies the amount of time to add.
   * @returns The new date with the time added.
   */
  public add(
    date: Date,
    amount: {
      years?: number;
      months?: number;
      weeks?: number;
      days?: number;
      hours?: number;
      minutes?: number;
      seconds?: number;
    }
  ): Date {
    return add(date, amount);
  }

  /**
   * Subtracts the specified amount of time from the given date.
   * @param date - The date from which time will be subtracted.
   * @param amount - An object that specifies the amount of time to subtract.
   * @returns The new date with time subtracted.
   */
  public sub(
    date: Date,
    amount: {
      years?: number;
      months?: number;
      weeks?: number;
      days?: number;
      hours?: number;
      minutes?: number;
      seconds?: number;
    }
  ): Date {
    return sub(date, amount);
  }
}
