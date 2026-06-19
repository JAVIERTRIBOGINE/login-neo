import type { LanguageConfiguration } from '@proteo/types';

/**
 * List of Proteo4 supported languages (with multiple options)
 */
export const Languages: { [language: string]: LanguageConfiguration } = {
  es: { language: 'es_ES', currency: 'es-ES', date: () => import('date-fns/locale/es').then((m) => m.default) },
  en: { language: 'en_GB', currency: 'en-GB', date: () => import('date-fns/locale/en-GB').then((m) => m.default) },
  ca: { language: 'ca_ES', currency: 'ca-ES', date: () => import('date-fns/locale/ca').then((m) => m.default) },
  gl: { language: 'gl_ES', currency: 'gl-ES', date: () => import('date-fns/locale/gl').then((m) => m.default) },
  eu: { language: 'eu_ES', currency: 'eu-ES', date: () => import('date-fns/locale/eu').then((m) => m.default) },
  fr: { language: 'fr_FR', currency: 'fr-FR', date: () => import('date-fns/locale/fr').then((m) => m.default) },
  de: { language: 'de_DE', currency: 'de-DE', date: () => import('date-fns/locale/de').then((m) => m.default) },
  va: { language: 'va_ES', currency: 'va-ES', date: () => import('date-fns/locale/ca').then((m) => m.default) }
};

/**
 * Default language string
 */
export const DEFAULT_LANGUAGE_STRING = 'ca';

/**
 * Key to save on session storage the current language
 */
export const STORAGE_LANGUAGE_KEY = 'LANGUAGE';

/**
 * Default language configuration
 */
export const DEFAULT_LANGUAGE = Languages[DEFAULT_LANGUAGE_STRING];
