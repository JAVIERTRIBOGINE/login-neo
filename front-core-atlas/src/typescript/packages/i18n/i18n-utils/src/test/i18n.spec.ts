import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LoggerUtils } from '@proteo/logger-utils';
import type { LanguageConfiguration } from '@proteo/types';
import type { FetchMock } from 'jest-fetch-mock';
import fetch from 'jest-fetch-mock';
import { Languages } from '../constants.js';
import { I18n } from '../i18n.js';
import { es } from 'date-fns/locale';

const fetchMock = fetch as unknown as FetchMock;
fetchMock.enableMocks();

describe('i18n', () => {
  let i18n: I18n;
  const warnSpy = jest.fn();

  LoggerUtils.prototype.warn = warnSpy;
  beforeEach(async () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        assign: jest.fn(),
        origin: 'https://apps.cdn.aws.bancsabadell.com'
      }
    });
    fetchMock.mockResolvedValue({
      json: () =>
        Promise.resolve({
          ACTIONS: { ACCEPT: 'Acceptar' },
          VALIDATION: { MIN_DATE: "Per emplenar aquest camp has d'introduir una data superior a {{minDate}}." }
        })
    } as Response);
    await I18n.initInstance(Languages.ca);
    i18n = I18n.getInstance();
  });

  afterEach(() => {
    jest.resetAllMocks();
    fetchMock.resetMocks();
  });

  it('fetch from default url', () => {
    const url = new URL('https://apps.cdn.aws.bancsabadell.com/conf/app/i18n/v0/common.i18n.ca_ES.json');
    expect(I18n.getI18nCommonUrl(Languages.ca.language)).toBe(url.toString());
    expect(i18n).toBeTruthy();
  });

  it('fetch from custom url', () => {
    const url = new URL('https://apps.cdn.aws.bancsabadell.com/conf/app/i18n/v0/common.i18n.ca_ES.json');
    const config: LanguageConfiguration = {
      language: 'random',
      currency: 'random',
      date: es
    };

    new I18n(config);

    expect(I18n.getI18nCommonUrl(Languages.ca.language)).toBe(url.toString());
  });

  describe('when i18n initialize language', () => {
    it('should dispatch language change event on initInstance', async () => {
      jest.spyOn(document, 'dispatchEvent') as jest.MockedFunction<typeof document.dispatchEvent>;
      await I18n.initInstance(Languages.ca);
      expect(document.dispatchEvent).toBeCalledWith(expect.any(CustomEvent<string>) as unknown as Event);
    });

    it('should set the default language when the language is invalid', async () => {
      const config = { language: 'error', currency: 'error', date: es };
      i18n = new I18n(config);

      expect(i18n.language).toBe(Languages.ca.language);
    });

    it('should change language and emit the new language selected', async () => {
      expect(i18n.language).toBe(Languages.ca.language);

      await i18n.use(Languages.en.language);
      expect(i18n.language).toBe(Languages.en.language);

      const handler = (newLanguage: CustomEvent<string>) => {
        expect(newLanguage.detail).toBe(Languages.es.language);
      };
      document.addEventListener(I18n.CHANGE_LANGUAGE_EVENT, handler as EventListener);

      await i18n.use(Languages.es.language, true);
      document.removeEventListener(I18n.CHANGE_LANGUAGE_EVENT, handler as EventListener);
    });

    it('should change language and return iso language', async () => {
      await i18n.use(Languages.en.language);
      expect(i18n.isoLanguage).toBe('en-GB');
    });

    it('should set the default language when the language used is invalid', async () => {
      const handler = (newLanguage: CustomEvent<string>) => {
        expect(newLanguage.detail).toBe(Languages.ca.language);
      };
      document.addEventListener(I18n.CHANGE_LANGUAGE_EVENT, handler as EventListener);

      await i18n.use('error', true);
      expect(i18n.language).toBe(Languages.ca.language);
      document.removeEventListener(I18n.CHANGE_LANGUAGE_EVENT, handler as EventListener);
    });

    it('when the language is a not valid isoLanguage and it know that comes from BSM, should change language and return iso language and emit a warn message', async () => {
      const spyWarn = jest.spyOn(LoggerUtils.prototype, 'warn') as jest.Mocked<typeof LoggerUtils.prototype.warn>;
      await i18n.use('en-US');
      expect(i18n.isoLanguage).toBe(Languages.en.currency);
      expect(spyWarn).toHaveBeenCalledWith('Language <en-US> is not supported, changing to a iso valid value: <en_GB>', {
        remoteLogger: true,
        type: 'application'
      });
    });

    it('when the user use the currency locale to set the locale language should set the correct iso language', async () => {
      await i18n.use('gl-ES');
      expect(i18n.language).toBe('gl_ES');
    });
  });

  it('should replace the key for the translated key', () => {
    expect(i18n.t('PROTEO4_COMMON:ACTIONS.ACCEPT')).toBe('Acceptar');
  });

  it('should replace the interpolation translation', () => {
    expect(
      i18n.html('PROTEO4_COMMON:VALIDATION.MIN_DATE', {
        minDate: '10/10/2009'
      })
    ).toBe("Per emplenar aquest camp has d'introduir una data superior a 10/10/2009.");
  });

  it('should not include a invalid group of translations in a NameSpace', () => {
    i18n.addNamespace('TEST', []);
    expect(warnSpy).toHaveBeenCalledWith('TranslationsMap for the namespace TEST are invalid', {
      remoteLogger: true,
      type: 'application'
    });
  });

  it('should not include a invalid language in a NameSpace', () => {
    const te_TE = {
      TEST: 'TE'
    };
    const ca_ES = {
      TEST: 'CA'
    };
    i18n.addNamespace('TEST', { te_TE, ca_ES });

    expect(warnSpy).toHaveBeenCalledWith('Language te_TE is not supported for the namespace TEST', {
      remoteLogger: true,
      type: 'application'
    });
    expect(i18n.t('TEST:TEST')).toBe('CA');
  });

  it('should fetch language json only when language changes', async () => {
    await i18n.loadCommonMessages(Languages.ca.language);
    await i18n.loadCommonMessages(Languages.ca.language);
    expect(fetchMock).toBeCalledTimes(0);

    await i18n.loadCommonMessages(Languages.fr.language);
    await i18n.loadCommonMessages(Languages.fr.language);
    expect(fetchMock).toBeCalledTimes(1);
  });

  it('should sanitize the key before translating', () => {
    expect(i18n.t('<script>document.cookie</script>PROTEO4_COMMON:ACTIONS.ACCEPT')).toBe('Acceptar');
    expect(
      i18n.html('<script>document.cookie</script>PROTEO4_COMMON:VALIDATION.MIN_DATE', {
        minDate: '10/10/2009'
      })
    ).toBe("Per emplenar aquest camp has d'introduir una data superior a 10/10/2009.");
  });
});
