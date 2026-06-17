
import { Injectable } from '@angular/core';
import { LOGIN_LANGUAGES } from '@app/login/domain/constants/login-languages.enum';
import { I18n } from '@proteo/i18n-utils';


@Injectable({
  providedIn: 'root'
})
export class LoginTranslationService {

  /**
   * changes the language of the translations
   * @param lang language code selected
   */
  changeLanguage(lang: LOGIN_LANGUAGES) {
    I18n.getInstance().use(lang as string, true) 
  }

  /**
   * 
   * @param key translation key got from json translation files
   * @returns the translation of that key of a given language
   */
  translateFromKey(key: string) {
    return I18n.getInstance().t(key)
  }

  getLanguage() {
    return I18n.getInstance().language
  }
  
}