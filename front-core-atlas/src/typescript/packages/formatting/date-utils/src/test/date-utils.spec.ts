import { expect, it, jest } from '@jest/globals';
import { LoggerUtils } from '@proteo/logger-utils';
import { setMonth } from 'date-fns';
import { I18n, I18nLangLoader } from '@proteo/i18n-utils';
import type { MockInstance } from 'jest-mock';

const mockLocale = {
  code: 'ca-ES',
  localize: {
    day: (num: number, options?: { width?: string }) => {
      const days: Record<string, any> = {
        narrow: ['dg', 'dl', 'dt', 'dc', 'dj', 'dv', 'ds'],
        abbreviated: ['dg.', 'dl.', 'dt.', 'dc.', 'dj.', 'dv.', 'ds.'],
        wide: ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte']
      };
      const width = options?.width || 'wide';
      return days[width][num];
    },
    month: (num: number, _options?: any) => {
      const months = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];
      return months[num];
    }
  },
  formatLong: {
    date: () => 'MMMM do, yyyy',
    time: () => 'HH:mm',
    dateTime: () => 'MMMM do, yyyy HH:mm'
  },
  match: {}
};

const mockI18nUse = jest.fn() as jest.MockedFunction<typeof I18n.prototype.use>;
const mockI18nLangLoaderLoadLocale = jest.fn() as jest.MockedFunction<typeof I18nLangLoader.prototype.loadLocale>;
mockI18nLangLoaderLoadLocale.mockReturnValue('ca');
const mockI18nGetLanguageConfiguration = jest.fn() as jest.MockedFunction<typeof I18n.prototype.getLanguageConfiguration>;
const mockI18nT = jest.fn() as jest.MockedFunction<typeof I18n.prototype.t>;
mockI18nT.mockReturnValue('mockTranslated');

const mockDebug = jest.fn();
const mockWarn = jest.fn();
const mockError = jest.fn();

jest.unstable_mockModule('@proteo/i18n-utils', () => ({
  I18n: jest.fn().mockImplementation(() => ({})),
  I18nLangLoader: jest.fn().mockReturnValue({
    loadLocale: mockI18nLangLoaderLoadLocale
  }),
  Languages: {
    ca: {
      language: 'ca_ES',
      currency: 'ca-ES',
      date: jest.fn().mockImplementation((_) => {
        return mockLocale;
      })
    }
  }
}));

let addEventListenerSpy: MockInstance<any>;

describe('date-utils', () => {
  let DateUtils: any;
  let I18n: any;
  let I18nLangLoader: any;
  let Languages: any;

  beforeEach(async () => {
    ({ I18n, I18nLangLoader, Languages } = await import('@proteo/i18n-utils'));

    I18n.CHANGE_LANGUAGE_EVENT = 'mockChangeLanguageEvent';
    I18n.initInstance = jest.fn() as jest.MockedFunction<typeof I18n.initInstance>;
    I18n.getInstance = jest.fn().mockImplementation(() => ({
      use: mockI18nUse,
      getLanguageConfiguration: mockI18nGetLanguageConfiguration,
      t: mockI18nT
    })) as jest.MockedFunction<typeof I18n.getInstance>;
    mockI18nGetLanguageConfiguration.mockReturnValue(Languages['ca']);

    I18nLangLoader.prototype.loadLocale = mockI18nLangLoaderLoadLocale;
    addEventListenerSpy = jest.spyOn(document, 'addEventListener');

    LoggerUtils.prototype.debug = mockDebug;
    LoggerUtils.prototype.warn = mockWarn;
    LoggerUtils.prototype.error = mockError;

    ({ DateUtils } = await import('../date-utils.js'));
  });

  afterEach(() => {
    (DateUtils as any)._instance = undefined;
    (DateUtils as any)._language = undefined;
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default config if not provided', async () => {
      expect.assertions(2);
      await DateUtils.initInstance();
      expect(mockI18nLangLoaderLoadLocale).toHaveBeenCalled();
      expect(addEventListenerSpy).toHaveBeenCalledWith('mockChangeLanguageEvent', expect.anything());
    });

    it('should initialize with given config if provided', async () => {
      expect.assertions(2);
      await DateUtils.initInstance(Languages['ca']);
      expect(mockI18nLangLoaderLoadLocale).not.toHaveBeenCalled();
      expect(addEventListenerSpy).toHaveBeenCalledWith('mockChangeLanguageEvent', expect.anything());
    });

    it('should initialize with default config if getting instance without previous initialization', async () => {
      expect.assertions(2);
      DateUtils.getInstance();
      expect(mockI18nLangLoaderLoadLocale).toHaveBeenCalled();
      expect(addEventListenerSpy).toHaveBeenCalledWith('mockChangeLanguageEvent', expect.anything());
    });
  });

  describe('onLanguageChange', () => {
    it('should process language change event', async () => {
      expect.assertions(1);
      await DateUtils.initInstance();
      document.dispatchEvent(new CustomEvent('mockChangeLanguageEvent', { detail: 'mockLanguage' }));
      expect(mockI18nGetLanguageConfiguration).toHaveBeenCalledWith('mockLanguage');
    });
  });

  describe('parse', () => {
    beforeEach(async () => {
      await DateUtils.initInstance(Languages['ca']);
    });

    it('should parse the dates with the default format and default language', async () => {
      expect.assertions(1);
      await DateUtils.initInstance();
      const date = DateUtils.getInstance();
      expect(date.parse('01/01/1970').getMilliseconds()).toBe(new Date(1970, 0, 1).getMilliseconds());
    });

    it('should parse the dates with the default format', () => {
      expect.assertions(4);
      const date = DateUtils.getInstance();
      expect(date.parse('01/01/1970').getMilliseconds()).toBe(new Date(1970, 0, 1).getMilliseconds());
      expect(date.parse('31/01/1970').getMilliseconds()).toBe(new Date(1970, 0, 31).getMilliseconds());
      expect(date.parse('01/12/1970').getMilliseconds()).toBe(new Date(1970, 11, 1).getMilliseconds());
      expect(date.parse('31/12/1970').getMilliseconds()).toBe(new Date(1970, 11, 31).getMilliseconds());
    });

    it('should parse the dates with format', () => {
      expect.assertions(8);
      const date = DateUtils.getInstance();
      expect(date.parse('01-01-1970', { format: 'dd-MM-yyyy' }).getMilliseconds()).toBe(new Date(1970, 0, 1).getMilliseconds());
      expect(date.parse('31-01-1970', { format: 'dd-MM-yyyy' }).getMilliseconds()).toBe(new Date(1970, 0, 31).getMilliseconds());
      expect(date.parse('01-12-1970', { format: 'dd-MM-yyyy' }).getMilliseconds()).toBe(new Date(1970, 11, 1).getMilliseconds());
      expect(date.parse('31-12-1970', { format: 'dd-MM-yyyy' }).getMilliseconds()).toBe(new Date(1970, 11, 31).getMilliseconds());
      expect(date.parse('01-01-1970', { format: 'MM-dd-yyyy' }).getMilliseconds()).toBe(new Date(1970, 0, 1).getMilliseconds());
      expect(date.parse('01-31-1970', { format: 'MM-dd-yyyy' }).getMilliseconds()).toBe(new Date(1970, 0, 31).getMilliseconds());
      expect(date.parse('12-01-1970', { format: 'MM-dd-yyyy' }).getMilliseconds()).toBe(new Date(1970, 11, 1).getMilliseconds());
      expect(date.parse('12-31-1970', { format: 'MM-dd-yyyy' }).getMilliseconds()).toBe(new Date(1970, 11, 31).getMilliseconds());
    });

    it('should return default date object if not proper date locale is received', async () => {
      expect.assertions(1);
      const date = DateUtils.getInstance();
      date._language.date = undefined;
      expect(date.parse('01/01/1970').getMilliseconds()).not.toBe(new Date(1970, 0, 1).getMilliseconds());
      date._language.date = mockLocale;
    });

    it('should throw an error if the format is undefined', () => {
      expect.assertions(2);
      const date = DateUtils.getInstance();
      try {
        date.parse('01-01-1970', { format: null as unknown as string });
      } catch (error) {
        expect(error).toBeDefined();
      }
      expect(mockError).toHaveBeenCalledWith(`[Date Utils] [parse] Format is not defined`, { remoteLogger: true, type: 'application' });
    });
  });

  describe('format', () => {
    beforeEach(async () => {
      await DateUtils.initInstance(Languages['ca']);
    });

    it('should format the dates with the default format', () => {
      expect.assertions(4);
      const date = DateUtils.getInstance();
      expect(date.format(new Date(1970, 0, 1))).toBe('01/01/1970');
      expect(date.format(new Date(1970, 0, 31))).toBe('31/01/1970');
      expect(date.format(new Date(1970, 11, 1))).toBe('01/12/1970');
      expect(date.format(new Date(1970, 11, 31))).toBe('31/12/1970');
    });

    it('should format the dates with format', () => {
      expect.assertions(8);
      const date = DateUtils.getInstance();
      expect(date.format(new Date(1970, 0, 1), { format: 'dd-MM-yyyy' })).toBe('01-01-1970');
      expect(date.format(new Date(1970, 0, 31), { format: 'dd-MM-yyyy' })).toBe('31-01-1970');
      expect(date.format(new Date(1970, 11, 1), { format: 'dd-MM-yyyy' })).toBe('01-12-1970');
      expect(date.format(new Date(1970, 11, 31), { format: 'dd-MM-yyyy' })).toBe('31-12-1970');
      expect(date.format(new Date(1970, 0, 1), { format: 'MM-dd-yyyy' })).toBe('01-01-1970');
      expect(date.format(new Date(1970, 0, 31), { format: 'MM-dd-yyyy' })).toBe('01-31-1970');
      expect(date.format(new Date(1970, 11, 1), { format: 'MM-dd-yyyy' })).toBe('12-01-1970');
      expect(date.format(new Date(1970, 11, 31), { format: 'MM-dd-yyyy' })).toBe('12-31-1970');
    });

    it('should return empty string if not proper date locale is received', async () => {
      expect.assertions(1);
      const date = DateUtils.getInstance();
      date._language.date = undefined;
      expect(date.format(new Date(1970, 0, 1))).toBe('');
      date._language.date = mockLocale;
    });

    it('should throw an error if the format is undefined', () => {
      expect.assertions(2);
      const date = DateUtils.getInstance();
      try {
        date.format(new Date(1970, 0, 1), { format: null as unknown as string });
      } catch (error) {
        expect(error).toBeDefined();
      }
      expect(mockError).toHaveBeenCalledWith(`[Date Utils] [format] Format is not defined`, { remoteLogger: true, type: 'application' });
    });
  });

  describe('set', () => {
    beforeEach(async () => {
      await DateUtils.initInstance(Languages['ca']);
    });

    it('should return a correct new date when it is set with new values', () => {
      expect.assertions(1);
      const date = new Date(2014, 8, 10);
      const dateUtil = DateUtils.getInstance();
      const result = dateUtil.set(date, { year: 2015, month: 9, date: 20 });
      expect(dateUtil.isEqual(result, new Date(2015, 9, 20))).toBeTruthy();
    });
  });

  describe('getDayName', () => {
    beforeEach(async () => {
      await DateUtils.initInstance(Languages['ca']);
    });

    it('should return the day name in the locale selected', () => {
      expect.assertions(1);
      const date = new Date(2014, 8, 1);
      const dateUtil = DateUtils.getInstance();
      expect(dateUtil.getDayName(date)).toBe('dilluns');
    });

    it('should return empty string if not proper date locale is received', async () => {
      expect.assertions(1);
      const date = new Date(2014, 8, 1);
      const dateUtil = DateUtils.getInstance();
      dateUtil._language.date = undefined;
      expect(dateUtil.getDayName(date)).toBe('');
      dateUtil._language.date = mockLocale;
    });
  });

  describe('getMonthNameFromDate', () => {
    beforeEach(async () => {
      await DateUtils.initInstance(Languages['ca']);
    });

    it('should return the month name in the locale selected', () => {
      expect.assertions(1);
      const date = setMonth(new Date(2014, 8, 1), 1);
      const dateUtil = DateUtils.getInstance();
      expect(dateUtil.getMonthNameFromDate(date)).toBe('febrer');
    });

    it('should return empty string if not proper date locale is received', async () => {
      expect.assertions(1);
      const date = setMonth(new Date(2014, 8, 1), 1);
      const dateUtil = DateUtils.getInstance();
      dateUtil._language.date = undefined;
      expect(dateUtil.getMonthNameFromDate(date)).toBe('');
      dateUtil._language.date = mockLocale;
    });
  });

  describe('getMonthNameFromIndex', () => {
    beforeEach(async () => {
      await DateUtils.initInstance(Languages['ca']);
    });

    it('should return the month name in the locale selected', () => {
      expect.assertions(1);
      const dateUtil = DateUtils.getInstance();
      expect(dateUtil.getMonthNameFromIndex(1)).toBe('febrer');
    });

    it('should return empty string if not proper date locale is received', async () => {
      expect.assertions(1);
      const dateUtil = DateUtils.getInstance();
      dateUtil._language.date = undefined;
      expect(dateUtil.getMonthNameFromIndex(1)).toBe('');
      dateUtil._language.date = mockLocale;
    });
  });

  describe('getTwoDigitsDate', () => {
    beforeEach(async () => {
      await DateUtils.initInstance(Languages['ca']);
    });

    it('should return the formatted date', () => {
      expect.assertions(2);
      const date = new Date(2014, 8, 1);
      const dateUtil = DateUtils.getInstance();
      expect(dateUtil.getTwoDigitsDate(date)).toBe('01');
      const date2 = new Date(2014, 8, 12);
      expect(dateUtil.getTwoDigitsDate(date2)).toBe('12');
    });
  });

  describe('getMonth', () => {
    beforeEach(async () => {
      await DateUtils.initInstance(Languages['ca']);
    });

    it('should return the month', () => {
      expect.assertions(1);
      const date = new Date(2014, 8, 1);
      const dateUtil = DateUtils.getInstance();
      expect(dateUtil.getMonth(date)).toBe(8);
    });
  });

  describe('getYear', () => {
    beforeEach(async () => {
      await DateUtils.initInstance(Languages['ca']);
    });

    it('should return the Full year', () => {
      expect.assertions(1);
      const date = new Date(2014, 8, 1);
      const dateUtil = DateUtils.getInstance();
      expect(dateUtil.getYear(date)).toBe(2014);
    });
  });

  describe('getDayNumberIntoTheWeek', () => {
    beforeEach(async () => {
      await DateUtils.initInstance(Languages['ca']);
    });

    it('should return the day number into the current week', () => {
      expect.assertions(1);
      const date = new Date(2014, 8, 1);
      const dateUtil = DateUtils.getInstance();
      expect(dateUtil.getDayNumberIntoTheWeek(date)).toBe(1);
    });
  });

  describe('getDaysOfAWeek', () => {
    beforeEach(async () => {
      await DateUtils.initInstance(Languages['ca']);
    });

    it('should return the day name of a Week', () => {
      expect.assertions(1);
      const dateUtil = DateUtils.getInstance();
      expect(dateUtil.getDaysOfAWeek()).toEqual(['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte']);
    });

    it('should be callable with length', () => {
      expect.assertions(3);
      const dateUtil = DateUtils.getInstance();
      expect(dateUtil.getDaysOfAWeek('narrow')).toEqual(['dg', 'dl', 'dt', 'dc', 'dj', 'dv', 'ds']);
      expect(dateUtil.getDaysOfAWeek('abbreviated')).toEqual(['dg.', 'dl.', 'dt.', 'dc.', 'dj.', 'dv.', 'ds.']);
      expect(dateUtil.getDaysOfAWeek('wide')).toEqual(['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte']);
    });

    it('should return array with empty string if not proper date locale is received', async () => {
      expect.assertions(1);
      const dateUtil = DateUtils.getInstance();
      dateUtil._language.date = undefined;
      expect(dateUtil.getDaysOfAWeek()).toEqual(['', '', '', '', '', '', '']);
      dateUtil._language.date = mockLocale;
    });
  });

  describe('getTimeZone', () => {
    beforeEach(async () => {
      await DateUtils.initInstance(Languages['ca']);
    });

    it('should return the timezone', () => {
      expect.assertions(1);
      const dateUtil = DateUtils.getInstance();
      expect(dateUtil.getTimeZone()).toBeTruthy();
    });
  });

  describe('getDaysOfMonth', () => {
    beforeEach(async () => {
      await DateUtils.initInstance(Languages['ca']);
    });

    it('should return the day number into the current week', () => {
      expect.assertions(1);
      const date = new Date(2014, 8, 1);
      const dateUtil = DateUtils.getInstance();
      expect(dateUtil.getDaysOfMonth(date).length).toBe(5);
    });
  });

  describe('isValid', () => {
    beforeEach(async () => {
      await DateUtils.initInstance(Languages['ca']);
    });

    it('should check the date if it is valid', () => {
      expect.assertions(2);
      const dateUtil = DateUtils.getInstance();
      expect(dateUtil.isValid(new Date(''))).toBeFalsy();
      expect(dateUtil.isValid(new Date(2014, 1, 31))).toBeTruthy();
    });
  });

  describe('isAfter', () => {
    beforeEach(async () => {
      await DateUtils.initInstance(Languages['ca']);
    });

    it('should compare two days and returns true if the first date is after the second one', () => {
      expect.assertions(2);
      const dateUtil = DateUtils.getInstance();
      const date = dateUtil.parse('10/12/2010');
      const dateCompare = dateUtil.parse('10/10/2010');
      expect(dateUtil.isAfter(date, dateCompare)).toBeTruthy();
      expect(dateUtil.isAfter(dateCompare, date)).toBeFalsy();
    });
  });

  describe('isBefore', () => {
    beforeEach(async () => {
      await DateUtils.initInstance(Languages['ca']);
    });

    it('should compare two days and returns true if the first date is before the second one', () => {
      expect.assertions(2);
      const dateUtil = DateUtils.getInstance();
      const date = dateUtil.parse('10/10/2010');
      const dateCompare = dateUtil.parse('10/11/2010');
      expect(dateUtil.isBefore(date, dateCompare)).toBeTruthy();
      expect(dateUtil.isBefore(dateCompare, date)).toBeFalsy();
    });
  });

  describe('isSameDay', () => {
    beforeEach(async () => {
      await DateUtils.initInstance(Languages['ca']);
    });

    it('should check two days and returns if it is the same date', () => {
      expect.assertions(2);
      const dateUtil = DateUtils.getInstance();
      const date = dateUtil.parse('10/10/2010');
      const dateCompare = dateUtil.parse('10/10/2010');
      expect(dateUtil.isSameDay(date, dateCompare)).toBeTruthy();
      dateCompare.setDate(11);
      expect(dateUtil.isSameDay(date, dateCompare)).toBeFalsy();
    });
  });

  describe('isSameMonth', () => {
    beforeEach(async () => {
      await DateUtils.initInstance(Languages['ca']);
    });

    it('should check two days and returns if it is the same month', () => {
      expect.assertions(2);
      const dateUtil = DateUtils.getInstance();
      const date = dateUtil.parse('10/10/2010');
      const dateCompare = dateUtil.parse('10/10/2010');
      expect(dateUtil.isSameMonth(date, dateCompare)).toBeTruthy();
      dateCompare.setMonth(0);
      expect(dateUtil.isSameMonth(date, dateCompare)).toBeFalsy();
    });
  });

  describe('isSameYear', () => {
    beforeEach(async () => {
      await DateUtils.initInstance(Languages['ca']);
    });

    it('should check two days and returns if it is the same year', () => {
      expect.assertions(2);
      const dateUtil = DateUtils.getInstance();
      const date = dateUtil.parse('10/10/2010');
      const dateCompare = dateUtil.parse('10/10/2010');
      expect(dateUtil.isSameYear(date, dateCompare)).toBeTruthy();
      dateCompare.setFullYear(2020);
      expect(dateUtil.isSameYear(date, dateCompare)).toBeFalsy();
    });
  });

  describe('isEqual', () => {
    beforeEach(async () => {
      await DateUtils.initInstance(Languages['ca']);
    });

    it('should check two days and returns if it is equals', () => {
      expect.assertions(2);
      const dateUtil = DateUtils.getInstance();
      const date = dateUtil.parse('10/10/2010');
      const dateCompare = dateUtil.parse('10/10/2010');
      expect(dateUtil.isEqual(date, dateCompare)).toBeTruthy();
      dateCompare.setFullYear(2020);
      expect(dateUtil.isEqual(date, dateCompare)).toBeFalsy();
    });
  });

  describe('isToday', () => {
    beforeEach(async () => {
      await DateUtils.initInstance(Languages['ca']);
    });

    it('should check if a date is today', () => {
      expect.assertions(2);
      const dateUtil = DateUtils.getInstance();
      const today = new Date(Date.now());
      const date = dateUtil.parse('10/10/2010');
      expect(dateUtil.isToday(date)).toBeFalsy();
      expect(dateUtil.isToday(today)).toBeTruthy();
    });
  });

  describe('isYesterday', () => {
    beforeEach(async () => {
      await DateUtils.initInstance(Languages['ca']);
    });

    it('should check if a date is yesterday', () => {
      expect.assertions(2);
      const dateUtil = DateUtils.getInstance();
      const today = new Date(Date.now());
      const yesterday = new Date(today.setDate(today.getDate() - 1));
      const date = dateUtil.parse('10/10/2010');
      expect(dateUtil.isYesterday(date)).toBeFalsy();
      expect(dateUtil.isYesterday(yesterday)).toBeTruthy();
    });
  });

  describe('compareAsc and compareDesc', () => {
    beforeEach(async () => {
      await DateUtils.initInstance(Languages['ca']);
    });

    it('should compare two dates and returns if it is after or before', () => {
      expect.assertions(4);
      const dateUtil = DateUtils.getInstance();
      const date = dateUtil.parse('10/10/2010');
      const dateCompare = dateUtil.parse('10/11/2009');
      expect(dateUtil.compareAsc(date, dateCompare)).toBe(1);
      expect(dateUtil.compareDesc(date, dateCompare)).toBe(-1);
      dateCompare.setFullYear(2020);
      expect(dateUtil.compareAsc(date, dateCompare)).toBe(-1);
      expect(dateUtil.compareDesc(date, dateCompare)).toBe(1);
    });
  });

  describe('formatDate', () => {
    beforeEach(async () => {
      await DateUtils.initInstance(Languages['ca']);
    });

    it('should return the correct format date or literal', () => {
      expect.assertions(4);
      const dateUtil = DateUtils.getInstance();
      const now = new Date(Date.now());
      const today = dateUtil.format(now);
      const yesterday = dateUtil.format(new Date(now.setDate(now.getDate() - 1)));
      const currentYearDate = dateUtil.set(now, { year: dateUtil.getYear(now), month: 10, date: 8 });
      const currentYear = dateUtil.format(currentYearDate);
      const pastYear = '08/11/2009';
      const datesConfig = { currentYearFormat: 'dd MMMM', otherYearFormat: 'dd MMMM yyyy' };
      expect(dateUtil.formatDate(today, datesConfig)).toBe('mockTranslated');
      expect(dateUtil.formatDate(yesterday, datesConfig)).toBe('mockTranslated');
      expect(dateUtil.formatDate(currentYear, datesConfig)).toBe('08 novembre');
      expect(dateUtil.formatDate(pastYear, datesConfig)).toBe('08 novembre 2009');
    });
  });

  describe('add', () => {
    let date: Date;
    let dateUtil: typeof DateUtils;

    beforeEach(async () => {
      await DateUtils.initInstance(Languages['ca']);
      date = new Date(2025, 5, 10);
      dateUtil = DateUtils.getInstance();
    });

    it('should add the right amount of days', () => {
      expect.assertions(2);
      expect(dateUtil.getTwoDigitsDate(dateUtil.add(date, { days: 2 }))).toBe('12');
      expect(dateUtil.getTwoDigitsDate(dateUtil.add(date, { days: 5 }))).toBe('15');
    });

    it('should add the right amount of months', () => {
      expect.assertions(2);
      expect(dateUtil.getMonth(dateUtil.add(date, { months: 2 }))).toBe(7);
      expect(dateUtil.getMonth(dateUtil.add(date, { months: 5 }))).toBe(10);
    });

    it('should add the right amount of years', () => {
      expect.assertions(2);
      expect(dateUtil.getYear(dateUtil.add(date, { years: 2 }))).toBe(2027);
      expect(dateUtil.getYear(dateUtil.add(date, { years: 5 }))).toBe(2030);
    });
  });

  describe('sub', () => {
    let date: Date;
    let dateUtil: typeof DateUtils;

    beforeEach(async () => {
      await DateUtils.initInstance(Languages['ca']);
      date = new Date(2025, 5, 10);
      dateUtil = DateUtils.getInstance();
    });

    it('should substract the right amount of days', () => {
      expect.assertions(2);
      expect(dateUtil.getTwoDigitsDate(dateUtil.sub(date, { days: 2 }))).toBe('08');
      expect(dateUtil.getTwoDigitsDate(dateUtil.sub(date, { days: 5 }))).toBe('05');
    });

    it('should substract the right amount of months', () => {
      expect.assertions(2);
      expect(dateUtil.getMonth(dateUtil.sub(date, { months: 2 }))).toBe(3);
      expect(dateUtil.getMonth(dateUtil.sub(date, { months: 5 }))).toBe(0);
    });

    it('should substract the right amount of years', () => {
      expect.assertions(2);
      expect(dateUtil.getYear(dateUtil.sub(date, { years: 2 }))).toBe(2023);
      expect(dateUtil.getYear(dateUtil.sub(date, { years: 5 }))).toBe(2020);
    });
  });

  // it('should changes the language when the I18n Emit the new Language', (done) => {
  //   const dateUtil: DateUtils = DateUtils.getInstance();
  //   I18n.getInstance().use('es_ES', true);
  //   setTimeout(() => {
  //     expect(dateUtil.getMonthNameFromIndex(1)).toBe('febrero');
  //     done();
  //   }, 0);
  // });
});
