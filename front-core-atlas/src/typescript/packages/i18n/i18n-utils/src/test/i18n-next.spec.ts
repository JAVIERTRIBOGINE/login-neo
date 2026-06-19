import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LoggerUtils } from '@proteo/logger-utils';
import { de } from 'date-fns/locale';
import type { Callback, InitOptions } from 'i18next';
import i18next from 'i18next';
import { Languages } from '../constants.js';
import { I18Next } from '../i18n-next';

describe('i18n next ', () => {
  beforeEach(async () => {
    LoggerUtils.prototype.warn = jest.fn();
    LoggerUtils.prototype.error = jest.fn();
  });
  afterEach(() => {
    jest.resetAllMocks();
    sessionStorage.clear();
  });
  it('builds', () => {
    const i18nNext = new I18Next(Languages['en']);
    expect(i18nNext).toBeTruthy();
    expect(i18nNext.getCurrentLanguage()).toBe('en_GB');
  });

  it('should print an error when i18Next has a problem to be initiated', () => {
    const onMock = jest.fn();
    const changeLanguageMock = jest.fn();
    const i18nextMockInstance = {
      on: onMock,
      changeLanguage: changeLanguageMock
    };
    const createInstanceMock = (__?: InitOptions | undefined, callback?: Callback | undefined) => {
      if (callback) {
        callback('Some test error', () => true);
      }
      return i18nextMockInstance;
    };
    jest.spyOn(i18next, 'createInstance').mockImplementation(createInstanceMock as never);
    new I18Next(Languages['en']);
    expect(LoggerUtils.prototype.error).toHaveBeenCalledWith('i18n-next: something went wrong loading: ', 'Some test error', {
      remoteLogger: true,
      type: 'application'
    });
  });

  it('should print a warning message when some key does not exist', () => {
    const instance = new I18Next(Languages['en']);
    instance.t('non-exist');
    expect(LoggerUtils.prototype.warn).toHaveBeenCalledWith('Missing translate key en_GB translation/non-exist non-exist', {
      remoteLogger: true,
      type: 'application'
    });
  });

  it('should print a warn messages when the language selected is invalid on initialization', async () => {
    sessionStorage.clear();
    new I18Next({ language: 'te_TE', currency: 'te-te', date: de });

    expect(LoggerUtils.prototype.warn).toBeCalledWith('The language selected is invalid:', 'te_TE', {
      remoteLogger: true,
      type: 'application'
    });
  });

  it('should print an error when language change emits an error', (done) => {
    const onMock = jest.fn();
    const changeLanguageMock = jest.fn();
    const i18nextMockInstance = {
      on: onMock,
      changeLanguage: changeLanguageMock.mockRejectedValue('[MOCK] Change language error' as never)
    };
    jest.spyOn(i18next, 'createInstance').mockReturnValue(i18nextMockInstance as never);
    new I18Next(Languages['en']);
    setTimeout(() => {
      expect(LoggerUtils.prototype.error).toHaveBeenCalledWith('i18n-next: Error on language change: ', '[MOCK] Change language error', {
        remoteLogger: true,
        type: 'application'
      });
      done();
    }, 0);
  });
});
