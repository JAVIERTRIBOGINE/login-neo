import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { I18n } from '@proteo/i18n-utils';
import { StringMap } from '@proteo/types';
import { provideTranslate } from './provide-translate';
import { TranslateService } from './providers/translate.service';
import { DEFAULT_LANGUAGE, INITIAL_NAMESPACE, INITIAL_TRANSLATIONS } from './translate.tokens';

const translations: any = {
  en_GB: {
    TEST: 'This is a test',
    NESTED: { TEST: 'This is a nested test' },
    TEST_PARAM: 'This is a {{param}}'
  },
  es_ES: {
    TEST: 'Esto es una prueba'
  }
};

const namespace = 'TEST_APP';
const defaultLang = 'en_GB';

describe('provideTranslate', () => {
  let translateService: TranslateService;
  let defaultLang: string;
  let namespace: string;
  let translations: StringMap;

  beforeEach(async () => {
    I18n.getInstance();

    TestBed.configureTestingModule({
      providers: [
        TranslateService,
        provideTranslate({
          namespace,
          translations,
          defaultLang
        })
      ]
    });

    await (TestBed.inject(ApplicationInitStatus) as ApplicationInitStatus).donePromise;

    translateService = TestBed.inject(TranslateService);

    defaultLang = TestBed.inject(DEFAULT_LANGUAGE);
    namespace = TestBed.inject(INITIAL_NAMESPACE);
    translations = TestBed.inject(INITIAL_TRANSLATIONS);
  });

  it('should inject data to token', () => {
    expect(defaultLang).toEqual(defaultLang);
    expect(namespace).toEqual(namespace);
    expect(translations).toEqual(translations);
  });
});
