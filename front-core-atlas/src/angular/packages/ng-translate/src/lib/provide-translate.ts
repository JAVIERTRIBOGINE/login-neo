import { APP_INITIALIZER, makeEnvironmentProviders } from '@angular/core';
import { TranslateService } from './providers/translate.service';
import { TranslateModuleConfig } from './translate.model';
import { DEFAULT_LANGUAGE, INITIAL_NAMESPACE, INITIAL_TRANSLATIONS } from './translate.tokens';

/**
 * Provides the translation module configuration and returns the environment providers.
 * @param config - The translation module configuration.
 * @returns The environment providers for the translation module.
 */
export function provideTranslate(config: TranslateModuleConfig) {
  return makeEnvironmentProviders([
    TranslateService,
    {
      provide: APP_INITIALIZER,
      useFactory: (translateService: TranslateService) => async () => {
        translateService.addNamespace(config.namespace, config.translations);

        if (config.defaultLang) {
          translateService.use(config.defaultLang);
        }
        return Promise.resolve();
      },
      multi: true,
      deps: [TranslateService]
    },
    { provide: DEFAULT_LANGUAGE, useValue: config.defaultLang },
    { provide: INITIAL_NAMESPACE, useValue: config.namespace },
    { provide: INITIAL_TRANSLATIONS, useValue: config.translations }
  ]);
}
