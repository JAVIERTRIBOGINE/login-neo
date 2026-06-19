import type { Locale } from 'date-fns';
import { EnumEnvironments } from './proteo.js';

export interface I18nConfiguration {
  HOST?: string;
  BASE_URL?: string;
  CMS_FLAGS?: string[];
}
/**
 * Model for a Proteo Language Configuration
 */
export interface LanguageConfiguration {
  language: string;
  currency: string;
  date: Locale | (() => Promise<Locale>);
}

export interface StringMap {
  [s: string]: KeyValueMap;
}

export interface KeyValueMap {
  [s: string]: Record<string, unknown> | string;
}

/**
 * Interface for implementing the proteo4 language loader. You must implement this interface
 * @method load loads the initial language configuration returning its string value, ej: es_ES or en_GB
 */
export interface ILangLoader {
  loadLocale: () => string;
}

/**
 * Common literals urls by environment
 */
export const COMMON_LITERALS = {
  [EnumEnvironments.INT]: 'https://apps.cdn.int.aws.bancsabadell.com/conf/app/i18n/v0/',
  [EnumEnvironments.PRE]: 'https://apps.cdn.pre.aws.bancsabadell.com/conf/app/i18n/v0/',
  [EnumEnvironments.PRO]: 'https://apps.cdn.aws.bancsabadell.com/conf/app/i18n/v0/'
};
