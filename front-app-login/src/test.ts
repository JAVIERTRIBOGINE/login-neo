import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { provideTranslate } from '@proteo/ng-translate';
import { I18n } from '@proteo/i18n-utils';

await I18n.initInstance();

const translations = {
  en_GB: {
    TEST: 'This is a test',
    NESTED: { TEST: 'This is a nested test' },
    TEST_PARAM: 'This is a {{param}}'
  },
  es_ES: {
    TEST: 'Esto es una prueba'
  }
};

provideTranslate({
  namespace: 'TEST_NAMESPACE',
  translations: translations,
  defaultLang: 'en_GB'
});

// Configuración de Angular para los tests
declare const require: {
  context(
    path: string,
    deep?: boolean,
    filter?: RegExp
  ): {
    keys(): string[];
    <T>(id: string): T;
  };
};

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());

// Then we find all the tests.
const context = require.context('./', true, /\.spec\.ts$/);
// And load the modules.
context.keys().forEach(context);
