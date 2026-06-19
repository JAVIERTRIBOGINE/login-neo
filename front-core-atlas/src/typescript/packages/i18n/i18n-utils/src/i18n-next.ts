import { LoggerUtils } from '@proteo/logger-utils';
import { sanitizeDOMString } from '@proteo/sanitization';
import { StorageManager } from '@proteo/storage-utils';
import type { LanguageConfiguration } from '@proteo/types';
import i18next, { type i18n, type ResourceKey, type TOptions } from 'i18next';
import { DEFAULT_LANGUAGE, Languages, STORAGE_LANGUAGE_KEY } from './constants.js';

export class I18Next {
  /**
   * I18n next library instance
   */
  private _i18nextInstance!: i18n;

  constructor(config: LanguageConfiguration) {
    this.createInstance(config);
    // FIXME: Avoid call an async function on constructor
    this.initI18Next(config);
  }

  /**
   * Auxiliary function to create an instance of i18 Next library
   * @param config: LanguageConfiguration
   */
  private createInstance(config: LanguageConfiguration) {
    this._i18nextInstance = i18next.createInstance(
      {
        fallbackLng: config.language,
        debug: false,
        saveMissing: true
      },
      (err) =>
        err &&
        LoggerUtils.getInstance().error('i18n-next: something went wrong loading: ', err, {
          remoteLogger: true,
          type: 'application'
        })
    );
  }

  /**
   * Auxiliary function to init the i18Next library
   *
   * @param config: LanguageConfiguration
   */
  private async initI18Next(config: LanguageConfiguration) {
    this._i18nextInstance.on('missingKey', (languages: string[], namespace: string, key: string, res: string) => {
      LoggerUtils.getInstance().warn(`Missing translate key ${languages.join(', ')} ${namespace}/${key} ${res}`, {
        remoteLogger: true,
        type: 'application'
      });
    });
    const isoLanguage = this.getLanguageToUse(config.language);
    await this.use(isoLanguage);
  }

  /**
   * Translations Maps (language: Tree of translations) is stored under a Namespace
   * @param namespace: Namespace of the translations group
   * @param isoLanguage: The language selected how a ISO format
   * @param translationMap: The translations Map tree. E.g: { es_ES: { 'GROUP': { 'TREE': 'value'}}, ca_ES: { 'TREE': 'value'}}}
   */
  public addNamespace(namespace: string, isoLanguage: string, translationMap: ResourceKey): void {
    this._i18nextInstance.addResourceBundle(isoLanguage, namespace, translationMap);
  }

  /**
   * Function to translate a key passed how a parameter.
   * This function replaces the interpolations on the second parameter if it is necessary
   *
   * @param key: string => The key is a combination of the namespace followed to colon and the key tree. The key is sanitized before translating.
   * @param interpolations: TOptions => Interpolation content to be replaced in the value retrieved by the key passed.
   *
   * Eg: keyValue = 'My text with an {{interpolationValue}}', TOptions = {interpolationValue: 'interpolation'}
   */
  public t(key: string, interpolations?: TOptions): string {
    return this._i18nextInstance.t(sanitizeDOMString(key), interpolations);
  }

  /**
   * Function to change the current language and save on session storage it
   * @param isoLanguage:string => ISO language : ca_ES, en_GB...
   */
  public async use(isoLanguage: string): Promise<void> {
    try {
      await this._i18nextInstance.changeLanguage(isoLanguage);
      this.saveLocalLanguage(isoLanguage);
    } catch (e) {
      LoggerUtils.getInstance().error('i18n-next: Error on language change: ', e, {
        remoteLogger: true,
        type: 'application'
      });
    }
  }

  /**
   * Save the language in the session storage
   * @param isoLanguage:string => ISO language : ca_ES, en_GB...
   */
  private saveLocalLanguage(isoLanguage: string) {
    StorageManager.getInstance().set(STORAGE_LANGUAGE_KEY, isoLanguage);
  }

  /**
   * Get the language stored into the session storage
   */
  private getLocalLanguage(): string | null {
    return StorageManager.getInstance().get(STORAGE_LANGUAGE_KEY);
  }

  /**
   * Auxiliary function to get the language. Check if exist a language stored on the session storage,
   * then check the optional language passed how a parameter. If it is invalid the function returns the default language
   *
   * @param isoLanguage:string => ISO language : ca_ES, en_GB...
   */
  private getLanguageToUse(isoLanguage: string) {
    return this.getLocalLanguage() || (isoLanguage && this.checkLanguage(isoLanguage));
  }

  /**
   * Auxiliary function to check if the language is a valid language for Proteo4.
   *
   * @param language: string => language to verify
   */
  private checkLanguage(language: string): string {
    let finalLanguage: string = DEFAULT_LANGUAGE.language;
    if (Object.values(Languages).some((l) => l.language === language)) {
      finalLanguage = language;
    } else {
      LoggerUtils.getInstance().warn('The language selected is invalid:', language, {
        remoteLogger: true,
        type: 'application'
      });
    }
    return finalLanguage;
  }

  /**
   * Get the language loaded in memory on the i18nNext instance
   */
  public getCurrentLanguage(): string {
    return this._i18nextInstance.language;
  }
}
