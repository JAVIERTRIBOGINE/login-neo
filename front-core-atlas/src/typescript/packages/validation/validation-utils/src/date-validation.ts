import { DateUtils } from '@proteo/date-utils';
import type { DateValidationParam, DateValidationReturn } from '@proteo/types';

export class DateValidation {
  private static dateUtils: DateUtils;
  /**
   * The function checks if
   * @param dateValParam
   */
  public static isValidDate(dateValParam: DateValidationParam): DateValidationReturn {
    this.dateUtils = DateUtils.getInstance();
    let isValid = false;
    const response: DateValidationReturn = { isValid: false, resultType: '' };
    const date: Date = this.parse(dateValParam.date);
    isValid = date && this.dateUtils.isValid(date);
    response.resultType = isValid ? 'valid' : 'invalid';

    isValid = this.minMaxValidation(isValid, date, dateValParam, response);

    response.isValid = isValid;

    return response;
  }

  private static minMaxValidation(
    isValid: boolean,
    date: Date,
    dateValParam: DateValidationParam,
    response: DateValidationReturn
  ): boolean {
    if (isValid) {
      if (dateValParam.min && !dateValParam.max) {
        isValid = this.validateMinNotMaxCase(date, dateValParam, response);
      } else if (dateValParam.max && !dateValParam.min) {
        isValid = this.validateMaxNotMinCase(date, dateValParam, response);
      } else if (dateValParam.max && dateValParam.min) {
        isValid = this.validateMaxAndMinCase(date, dateValParam, response);
      }
    }
    return isValid;
  }

  private static validateMinNotMaxCase(
    date: Date,
    dateValParam: DateValidationParam,
    response: DateValidationReturn
  ): boolean {
    const minDate = this.parse(`${dateValParam.min}`);
    const isValid = (minDate && this.dateUtils.isAfter(date, minDate)) || this.dateUtils.isSameDay(date, minDate);
    if (!isValid) {
      response.resultType = 'min';
    }
    return isValid;
  }

  private static validateMaxNotMinCase(
    date: Date,
    dateValParam: DateValidationParam,
    response: DateValidationReturn
  ): boolean {
    const maxDate = this.parse(`${dateValParam.max}`);
    const isValid = (maxDate && this.dateUtils.isBefore(date, maxDate)) || this.dateUtils.isSameDay(date, maxDate);
    if (!isValid) {
      response.resultType = 'max';
    }
    return isValid;
  }

  private static validateMaxAndMinCase(
    date: Date,
    dateValParam: DateValidationParam,
    response: DateValidationReturn
  ): boolean {
    const minDate = this.parse(`${dateValParam.min}`);
    const maxDate = this.parse(`${dateValParam.max}`);
    const isValid =
      ((minDate && this.dateUtils.isAfter(date, minDate)) || this.dateUtils.isSameDay(date, minDate)) &&
      ((maxDate && this.dateUtils.isBefore(date, maxDate)) || this.dateUtils.isSameDay(date, maxDate));
    if (!isValid) {
      response.resultType = 'both';
    }
    return isValid;
  }

  private static parse(date: string): Date {
    return this.dateUtils.parse(date, { format: 'dd/MM/yyyy' });
  }
}
