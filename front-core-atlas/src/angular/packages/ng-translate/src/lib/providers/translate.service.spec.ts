import { TestBed } from '@angular/core/testing';
import { I18n } from '@proteo/i18n-utils';
import { provideTranslate } from '../provide-translate';
import { TranslateService } from './translate.service';

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

describe('TranslateService', () => {
  let service: TranslateService;

  beforeEach(() => {
    I18n.getInstance();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: 'I18nConfig',
          useValue: {
            remote: {
              base: 'https://apps.cdn.int.aws.bancsabadell.com/'
            }
          }
        },
        provideTranslate({
          defaultLang,
          namespace,
          translations
        })
      ]
    });
    service = TestBed.inject(TranslateService);
  });

  afterEach(() => {
    service = undefined;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should change language and translate a string', () => {
    TranslateService.getInstance().use('es_ES', true);
    expect(service.t(`${namespace}:TEST`)).toEqual('Esto es una prueba');
  });
});
