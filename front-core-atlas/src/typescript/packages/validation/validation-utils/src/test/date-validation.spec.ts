import { describe, expect, it } from '@jest/globals';
import { DateUtils } from '@proteo/date-utils';
import { DateValidation } from '../date-validation.js';

describe('date-validation', () => {
  beforeAll(async () => {
    await DateUtils.initInstance();
  });
  it('should return true for a valid date', () => {
    expect(DateValidation.isValidDate({ date: '12/02/2020' }).isValid).toBeTruthy();
    expect(DateValidation.isValidDate({ date: '05/12/1980' }).isValid).toBeTruthy();
  });

  it('should return false for an invalid date', () => {
    expect(DateValidation.isValidDate({ date: '30/02/2020' }).isValid).toBeFalsy();
    expect(DateValidation.isValidDate({ date: '31/04/2020' }).isValid).toBeFalsy();
  });

  it('should return false for a valid date before min or after max', () => {
    expect(DateValidation.isValidDate({ date: '12/02/2020', min: '12/02/2021' }).isValid).toBeFalsy();
    expect(DateValidation.isValidDate({ date: '12/02/2020', max: '12/01/2020' }).isValid).toBeFalsy();
  });

  it('should return true for a valid date after min and before max', () => {
    expect(DateValidation.isValidDate({ date: '12/02/2020', min: '12/02/2019', max: '12/02/2021' }).isValid).toBeTruthy();
  });

  it('should return false for a valid date out of range', () => {
    expect(DateValidation.isValidDate({ date: '12/02/2020', min: '12/02/2021', max: '12/02/2022' }).isValid).toBeFalsy();
  });

  it('should return true for a valid date same min and same max', () => {
    expect(DateValidation.isValidDate({ date: '12/02/2020', min: '12/02/2020', max: '12/02/2021' }).isValid).toBeTruthy();
    expect(DateValidation.isValidDate({ date: '12/02/2020', min: '12/02/2019', max: '12/02/2020' }).isValid).toBeTruthy();
  });
});
