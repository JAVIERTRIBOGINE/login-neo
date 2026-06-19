import { LoggerUtils } from '@proteo/logger-utils';
import { COMMON_LITERALS, type LanguageConfiguration } from '@proteo/types';
import type { ResourceKey, StringMap, TOptions } from 'i18next';
import { DEFAULT_LANGUAGE, Languages } from './constants.js';
import { I18nLangLoader } from './i18n-lang-loader.js';
import { I18Next } from './i18n-next.js';
import { getEnvironment } from '@proteo/environment-detection-utils';

let baseUrl: URL;
const loadedLanguages: Record<string, Promise<ResourceKey>> = {};

/**
 * Main class for i18n related to the proteo architecture
 */
export class I18n {
  /**
   * I18n change language custom event to emit
   */
  public static CHANGE_LANGUAGE_EVENT = 'bsLanguageChange';

  /**
   * I18n change language custom event to emit for components
   */
  public static CHANGE_LANGUAGE_COMPONENTS_EVENT = 'bsLanguageComponentsChange';

  /**
   * I18n service instance
   */
  private static _instance: I18n;

  /**
   * I18n Next library implementation instance
   */
  private readonly i18nNext: I18Next;

  constructor(languageConfig?: LanguageConfiguration) {
    const origin = window.location.origin;
    let galateaHost: string | undefined = undefined;
    if (!origin.match(/apps\.cdn.*?aws\.bancsabadell\.com/)) {
      const scriptTags: NodeListOf<HTMLScriptElement> = document.querySelectorAll('script[type=module]');
      scriptTags.forEach((scriptTag) => {
        if (scriptTag.src.indexOf('galatea') >= 0) {
          galateaHost = scriptTag.src;
        }
      });
    }
    const environment = getEnvironment(galateaHost);
    const COMMON_LITERALS_URL = COMMON_LITERALS[environment];
    baseUrl = new URL(COMMON_LITERALS_URL);
    this.i18nNext = new I18Next(languageConfig || Languages[new I18nLangLoader().loadLocale()]);
    this.languageChangeHandler = this.languageChangeHandler.bind(this);
    // Register change language event to change all proteo core instances
    // (ex. core instance of other libraries used by an application)
    document.addEventListener(I18n.CHANGE_LANGUAGE_EVENT, this.languageChangeHandler);
  }

  private async languageChangeHandler(event: Event) {
    const language: LanguageConfiguration = this.getLanguageConfiguration((event as CustomEvent).detail);
    await this.use(language.language, false);
    document.dispatchEvent(new CustomEvent(I18n.CHANGE_LANGUAGE_COMPONENTS_EVENT));
  }

  /**
   * Init instance as singleton with configuration
   * @param config
   */
  public static async initInstance(languageConfig?: LanguageConfiguration) {
    if (!window.BsI18n) {
      if (languageConfig) {
        I18n._instance = new I18n(languageConfig);
      } else {
        I18n._instance = new I18n();
      }
      window.BsI18n = I18n._instance;
      await I18n._instance.use(I18n._instance.isoLanguage, true);
    } else {
      LoggerUtils.getInstance().info(
        `[i18n] Try to initInstance but instance already exists, change language with ${languageConfig?.language ?? DEFAULT_LANGUAGE.language}`
      );
      if (languageConfig) {
        await window.BsI18n.use(languageConfig.language, true);
      }
    }
  }

  /**
   * Get instance of I18n component
   * @returns {I18n}
   */
  public static getInstance(): I18n {
    if (!window.BsI18n) {
      I18n.initInstance();
    }
    return window.BsI18n;
  }

  public static getI18nCommonUrl(language: string) {
    return new URL(`common.i18n.${language}.json`, baseUrl).toString();
  }
  // public async initInstance(languageConfig?: LanguageConfiguration, i18nConfig?: I18nConfiguration) {
  //   I18n._instance = new I18n(languageConfig, i18nConfig);
  //   await I18n._instance.use(I18n._instance.isoLanguage, true);
  // }
  /**
   * Add Translations for a language into a namespace
   * @param {string} namespace
   * @param {string} isoLanguage
   * @param {ResourceKey} translationMap
   */
  public addLanguageToNamespace(namespace: string, isoLanguage: string, translationMap: ResourceKey): void {
    window.BsI18n.i18nNext.addNamespace(namespace, isoLanguage, translationMap);
  }

  /**
   * Add a namespace with language and it translations
   * @param {string} namespace
   * @param {StringMap} translationMapByLanguage
   */
  public addNamespace(namespace: string, translationMapByLanguage: StringMap): void {
    if (this.isNameSpaceValid(namespace, translationMapByLanguage)) {
      for (const i in translationMapByLanguage) {
        if (
          Object.prototype.hasOwnProperty.call(translationMapByLanguage, i) &&
          Object.values(Languages).some((l) => l.language === i)
        ) {
          this.addLanguageToNamespace(namespace, i, translationMapByLanguage[i]);
        } else {
          LoggerUtils.getInstance().warn(`Language ${i} is not supported for the namespace ${namespace}`, {
            remoteLogger: true,
            type: 'application'
          });
        }
      }
    } else {
      LoggerUtils.getInstance().warn(`TranslationsMap for the namespace ${namespace} are invalid`, {
        remoteLogger: true,
        type: 'application'
      });
    }
  }

  /**
   * Auxiliary function to check if the namespace and the translation map is valid to add on i18 driver
   * @param namespace: string => Unique namespace to pairing translations
   * @param translationMapByLanguage: StringMap => Translations map associated to the namespace constant
   */
  private isNameSpaceValid(namespace: string, translationMapByLanguage: StringMap) {
    return !!namespace && !!translationMapByLanguage && Object.keys(translationMapByLanguage).length;
  }

  /**
   * Translate a key
   * @param {string} key
   * @param {TOptions} interpolations
   * @returns {string}
   */
  public t(key: string, interpolations?: TOptions): string {
    return window.BsI18n.i18nNext.t(key, interpolations);
  }

  /**
   * Translate a key and do not escape values (for html usage)
   * @param {string} key
   * @param {TOptions} interpolations
   * @returns {string}
   */
  public html(key: string, interpolations?: TOptions): string {
    return window.BsI18n.i18nNext.t(key, { ...interpolations, interpolation: { escapeValue: false } });
  }

  /**
   * Search the language configuration associated to the isoLanguage / currency locale
   * @param isoLanguage : string => Iso Language
   * @returns LanguageConfiguration
   */
  public getLanguageConfiguration(isoLanguage: string): LanguageConfiguration {
    // Check for BSM scenarios where english is passed as american
    if (isoLanguage === 'en-US') {
      isoLanguage = 'en_GB';
      LoggerUtils.getInstance().warn('Language <en-US> is not supported, changing to a iso valid value: <en_GB>', {
        remoteLogger: true,
        type: 'application'
      });
    }
    return (
      Object.values(Languages).find((l) => l.language === isoLanguage || l.currency === isoLanguage) || DEFAULT_LANGUAGE
    );
  }

  /**
   * Change language
   * @param {string} isoLanguage
   * @param {boolean} shouldEmitChange true if the change should be propagated using a custom event
   */
  public async use(isoLanguage: string, shouldEmitChange?: boolean): Promise<void> {
    const { language } = this.getLanguageConfiguration(isoLanguage);
    await window.BsI18n.i18nNext.use(language);
    const commonMessages = await this.loadCommonMessages(language);

    this.addLanguageToNamespace('PROTEO4_COMMON', language, commonMessages as ResourceKey);

    if (shouldEmitChange) {
      document.dispatchEvent(new CustomEvent<string>(I18n.CHANGE_LANGUAGE_EVENT, { detail: language }));
    }
  }

  /**
   * Get current language
   * @returns {string}: language selected
   */
  public get language() {
    return window.BsI18n.i18nNext.getCurrentLanguage();
  }

  /**
   * Get current iso language (format with language-country ex. ca-ES)
   * @returns {string}: language selected
   */
  public get isoLanguage() {
    return window.BsI18n.i18nNext.getCurrentLanguage().replace('_', '-');
  }

  /**
   * Check is language is on the list
   *
   * @param language isoLanguage
   * @returns {boolean}
   */
  public isValidLanguage(language: string) {
    return Object.values(Languages).some((item) => item.language === language);
  }

  /**
   * Load common translations in namespace "PROTEO4_COMMON"
   */
  public async loadCommonMessages(language = DEFAULT_LANGUAGE.language): Promise<ResourceKey | undefined> {
    if (!this.isValidLanguage(language)) {
      return this.loadCommonMessages(DEFAULT_LANGUAGE.language);
    }
    return this.fetchCommonMessages(language);
  }

  async fetchCommonMessages(language: string): Promise<ResourceKey | undefined> {
    try {
      if (!loadedLanguages[language]) {
        loadedLanguages[language] = await fetch(I18n.getI18nCommonUrl(language)).then((response) => response.json());
      }
      return loadedLanguages[language];
    } catch (e) {
      LoggerUtils.getInstance().error('i18n-next: Error on load common message: ', e, {
        remoteLogger: true,
        type: 'application'
      });
      return undefined;
    }
  }

  combineCommonMessages(commonMessages: StringMap, thirdPartyMessages: StringMap): StringMap {
    const result: StringMap = { ...commonMessages };
    const keys = Object.keys(thirdPartyMessages);
    for (const key of keys) {
      if (
        key in result &&
        typeof result[key] === 'object' &&
        typeof thirdPartyMessages[key] === 'object' &&
        !Array.isArray(result[key]) &&
        !Array.isArray(thirdPartyMessages[key])
      ) {
        result[key] = this.combineCommonMessages(result[key] as StringMap, thirdPartyMessages[key] as StringMap);
      } else {
        result[key] = thirdPartyMessages[key];
      }
    }
    return result;
  }
}
