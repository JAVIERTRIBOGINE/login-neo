import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { I18nLangLoader } from '../i18n-lang-loader';
import {
  clearMock,
  fakeCookieNotAllowedLang,
  fakeCookieWithLang,
  fakeCookieWithNoLang,
  fakeLocationNoLang,
  fakeLocationNotAllowedLang,
  fakeLocationWithLang,
  startLangMock
} from './mocks/i18n-lang-mocks';

describe('i18n Loader', () => {
  let i18nLoader: I18nLangLoader;

  beforeEach(() => {
    i18nLoader = new I18nLangLoader();
  });

  afterEach(() => {
    jest.clearAllMocks();
    clearMock();
  });

  it('when lang is in URL params and is allowed it should return it', () => {
    expect.assertions(1);
    startLangMock(fakeLocationWithLang);
    expect(i18nLoader.loadLocale()).toEqual('es');
  });

  it('when lang is in the cookie, not in URL and is allowed it should return it', () => {
    expect.assertions(1);
    startLangMock(fakeLocationNoLang, fakeCookieWithLang);
    expect(i18nLoader.loadLocale()).toEqual('en');
  });

  it('when lang is in the storage, not in URL or cookies and is allowed it should return it', () => {
    expect.assertions(1);
    startLangMock(fakeLocationNoLang, fakeCookieWithNoLang, 'gl-ES');
    expect(i18nLoader.loadLocale()).toEqual('gl');
  });

  it('when lang is not in URL params, cookie or storage and the user has an allowed lang configured in browser it should return it', () => {
    expect.assertions(1);
    startLangMock(fakeLocationNoLang, fakeCookieWithNoLang, 'ja', 'fr_FR');
    expect(i18nLoader.loadLocale()).toEqual('fr');
  });

  it('when lang is not in URL params, cookie or storage and the user has not an allowed lang configured in browser but in other browser languages it should return it', () => {
    expect.assertions(1);
    startLangMock(fakeLocationNoLang, fakeCookieWithNoLang, 'ja', 'zh', ['zh', 'en-US', 'en']);
    expect(i18nLoader.loadLocale()).toEqual('en');
  });

  it('when no lang is configured by the user and an external default language is set, it should return the external default language', () => {
    expect.assertions(1);
    startLangMock(fakeLocationNoLang, fakeCookieWithNoLang, 'ja', 'zh');
    expect(i18nLoader.loadLocale()).toEqual('ca');
  });

  it('when no lang is configured by the user it should return the default language', () => {
    expect.assertions(1);
    startLangMock(fakeLocationNoLang, fakeCookieWithNoLang, 'ja', 'zh');
    expect(i18nLoader.loadLocale('en-US')).toEqual('en');
  });

  it('when lang is configured by the user but not allowed it should return the default language', () => {
    expect.assertions(1);
    startLangMock(fakeLocationNotAllowedLang, fakeCookieNotAllowedLang, 'zh', 'ja');
    expect(i18nLoader.loadLocale()).toEqual('ca');
  });
});
