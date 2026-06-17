import { importProvidersFrom } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideProteoBootstrap } from '@proteo/ng-bootstrap';
import { provideTranslate } from '@proteo/ng-translate';
import { ProteoStoreModule } from '@proteo/ng-store';
import { AppComponent } from './app/app.component';
import { InfoRepository } from './app/login/domain/repositories/info.repository';
import { InfoMockRepository } from './app/login/infrastructure/mock/info-mock.repository';
import { counterReducer } from './app/login/infrastructure/store/reducers/counter.reducer';
import { environment } from './environments/environment';
import { APP_ROUTES } from './app/app.routes';
import AppMessages from './assets/i18n';
import { LOCAL_AUTH_TOKEN } from '@app/tokens';

/**
* Bootstrap the application with the specified component and configuration.
*/
bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),

    /**
     * Provides the Proteo bootstrap configuration.
     */
    provideProteoBootstrap({
      config: {
        HOST: '/',
        CONFIG_BASE_PATH: environment.configBasePath
      },
      staticRoutes: APP_ROUTES
    }),

    /**
     * Provides the translation configuration.
     */
    provideTranslate({
      defaultLang: 'es',
      namespace: 'login',
      translations: AppMessages
    }),

    /**
     * Imports providers from ProteoStoreModule and configures the store.
     */
    importProvidersFrom(ProteoStoreModule.forRoot({ 'counter': counterReducer }, {
      runtimeChecks: {
        strictStateImmutability: false,
        strictActionImmutability: false,
      },
    })),

    /**
     * Provides the store devtools configuration.
     */
    provideStoreDevtools({
      maxAge: 25
    }),

    /**
     * Provides the InfoRepository with the InfoMockRepository implementation.
     */
    {
      provide: InfoRepository,
      useClass: InfoMockRepository
    },

    /**
     * Provides the LOCAL_AUTH_TOKEN with the environment.auth value.
     */
    {
      provide: LOCAL_AUTH_TOKEN,
      useFactory: () => environment.auth
    }
  ]
});
