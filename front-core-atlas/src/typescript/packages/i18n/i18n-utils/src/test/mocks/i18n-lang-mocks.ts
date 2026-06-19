import { jest } from '@jest/globals';
import { StorageManager } from '@proteo/storage-utils';
import { STORAGE_LANGUAGE_KEY } from '../../constants.js';

/**
 * LOCATION URL FAKE VALUES
 */
export const fakeLocationWithLang = '/test?v=lXbjICP6V44&lang=es_ES';
export const fakeLocationNoLang = 'http://localhost/test?v=lXbjICP6V44';
export const fakeLocationNotAllowedLang = 'http://localhost/test?v=lXbjICP6V44&lang=zh';

/**
 * COOKIES FAKE VALUES
 */
const expirationDate = new Date();
expirationDate.setFullYear(expirationDate.getFullYear() + 10);
export const fakeCookieWithLang = `bs_lang=en_GB ; expires=${expirationDate.toUTCString()} path=/`;
export const fakeCookieNotAllowedLang = `bs_lang=zh ; expires=${expirationDate.toUTCString()}; path=/`;
export const fakeCookieWithNoLang = ``;

/**
 * generates the test state
 * @param url the URL to simulate de test
 * @param cookie the cookies to simulate the test
 * @param storageLang the Session storage lang value
 * @param browserLang the browser lang value
 * @param browserLanguages array of browser languages
 */
export const startLangMock = (
  url: string,
  cookie?: string,
  storageLang?: string,
  browserLang?: string,
  browserLanguages: string[] = []
): void => {
  window.history.replaceState({}, 'Test Title', url);
  if (cookie) document.cookie = cookie;
  if (storageLang) StorageManager.getInstance().set(STORAGE_LANGUAGE_KEY, storageLang);
  if (browserLang) jest.spyOn(window.navigator, 'language', 'get').mockReturnValue(browserLang);
  jest.spyOn(window.navigator, 'languages', 'get').mockReturnValue(browserLanguages);
};

/**
 * Clears all data modified by the test
 */
export const clearMock = (): void => {
  StorageManager.getInstance().remove(STORAGE_LANGUAGE_KEY);
  document.cookie.split(';').forEach((c) => {
    const eqPos = c.indexOf('=');
    const name = eqPos > -1 ? c.substr(0, eqPos) : c;
    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });
};
