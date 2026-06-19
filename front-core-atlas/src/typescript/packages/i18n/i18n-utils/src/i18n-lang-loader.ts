import { LoggerUtils } from '@proteo/logger-utils';
import { StorageManager } from '@proteo/storage-utils';
import type { ILangLoader } from '@proteo/types';
import { DEFAULT_LANGUAGE_STRING, Languages, STORAGE_LANGUAGE_KEY } from './constants.js';

/**
 * I18n Loader for language initialization. Tries to load the initial language depending on some special order
 */
export class I18nLangLoader implements ILangLoader {
  private readonly LANG_URL_PARAM_REGEX = /[?&]lang(?:uage)?(=([^&#]*)|&|#|$)/i;
  private readonly COOKIE_NAME_REGEX = /(?:^| )bs_lang(?:uage)?=([^;]+)/i;
  private readonly SUPPORTED_LANGUAGES = Object.keys(Languages);

  /**
   * Tries to load the language in the follow order:
   * 1- URL Params
   * 2- Cookie
   * 3- Storage
   * 4- Browser
   * 5- Config
   * @returns the language string in the canonical language tag format ej: en, es, ...
   */
  loadLocale(defaultRemoteConfLanguage?: string): string {
    return (
      this.loadLanguageFromURL() ||
      this.loadLanguageFromCookie() ||
      this.loadLanguageFromStorage() ||
      this.loadLanguageFromBrowser() ||
      this.loadLanguageFromConf(defaultRemoteConfLanguage) ||
      this.loadLanguageFromLocalConf()
    );
  }

  /**
   * Checks if a language is supported by the app
   * @param lang language to be checked
   */
  private isSupportedLanguage(lang: string): boolean {
    return this.SUPPORTED_LANGUAGES.some((l) => l === lang);
  }

  /**
   * Parses language returning its canonical language
   * @param lang language to be parsed
   */
  private parseLanguage(lang?: string): string {
    return lang ? lang.split(/_|-/)[0] : '';
  }

  /**
   * Tries to load the language from URL params: lang or language ignoring camel case.
   * I would like to use URLSearchParams API Interface, but it does not support get the params from RegExp.
   * @returns empty string if params not found or language not supported
   */
  private loadLanguageFromURL(): string {
    const win = window;
    const queryParams = win.location.search;
    const results = this.LANG_URL_PARAM_REGEX.exec(queryParams);
    const LANG_INDEX = 2;
    if (!results || !results[LANG_INDEX]) return '';
    const lang = this.parseLanguage(win.decodeURIComponent(results[LANG_INDEX]));
    LoggerUtils.getInstance().debug(`Lang retrieved from URL: ${lang}`, {
      remoteLogger: true,
      type: 'application'
    });
    return this.isSupportedLanguage(lang) ? lang : '';
  }

  /**
   * tries to load the language from browser cookies: bs_lang or bs_language ignoring camel case
   * @returns empty string if cookie not found or language not supported
   */
  private loadLanguageFromCookie(): string {
    const results = this.COOKIE_NAME_REGEX.exec(window.document.cookie);
    if (!results || !results[1]) return '';
    const lang = this.parseLanguage(results[1]);
    LoggerUtils.getInstance().debug(`Lang retrieved from cookie: ${lang}`, {
      remoteLogger: true,
      type: 'application'
    });
    return this.isSupportedLanguage(lang) ? lang : '';
  }

  /**
   * tries to load the language from session storage: bs.lang or bs.language ignoring camel case
   * @returns empty string if storage attr not found or language not supported
   */
  private loadLanguageFromStorage(): string {
    const item = StorageManager.getInstance().get(STORAGE_LANGUAGE_KEY);
    LoggerUtils.getInstance().debug(`Lang retrieved from storage: ${item}`, {
      remoteLogger: true,
      type: 'application'
    });
    if (!item) return '';
    const lang = this.parseLanguage(item as string);
    return this.isSupportedLanguage(lang) ? lang : '';
  }

  /**
   * tries to load the language from BOM (Browser Object Model)
   * @returns empty string if object not found or language not supported
   */
  private loadLanguageFromBrowser(): string {
    const nav = window.navigator,
      lang = this.parseLanguage(nav.language),
      languages = nav.languages || [];
    if (this.isSupportedLanguage(lang)) return lang;
    const supportedLanguages = languages.find((e) => this.isSupportedLanguage(this.parseLanguage(e))) || '';
    LoggerUtils.getInstance().debug(`Lang retrieved from browser languages array: ${supportedLanguages}`, {
      remoteLogger: true,
      type: 'application'
    });
    return this.parseLanguage(supportedLanguages);
  }

  /**
   * Returns the default language configuration from remote static data
   */
  private loadLanguageFromConf(defaultLanguage?: string): string {
    const lang = this.parseLanguage(defaultLanguage);
    if (this.isSupportedLanguage(lang)) {
      LoggerUtils.getInstance().debug(`Lang retrieved from default remote conf: ${lang}`, {
        remoteLogger: true,
        type: 'application'
      });
      return lang;
    }
    return '';
  }

  /**
   * Returns the default language from local code
   */
  private loadLanguageFromLocalConf(): string {
    LoggerUtils.getInstance().debug(`Lang retrieved from default local conf: ${DEFAULT_LANGUAGE_STRING}`, {
      remoteLogger: true,
      type: 'application'
    });
    return DEFAULT_LANGUAGE_STRING;
  }
}
