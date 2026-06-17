import { Component, AfterViewInit, OnInit, inject, InjectionToken } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LoggerUtils } from '@proteo/logger-utils';
import { isFullProteo } from '@proteo/platform-utils';
import { I18n, Languages } from '@proteo/i18n-utils';
import { BaseAppConfig } from '@proteo/types';
import { PROTEO_APP_CONF } from '@proteo/ng-bootstrap';
import { LOGIN_LANGUAGES } from './login/domain/constants/login-languages.enum';
import { AppConfig } from './login/domain/models/app-config.model';

@Component({
  selector: 'app-login-root',
  standalone: true,
  imports: [RouterModule],
  template: ` <router-outlet></router-outlet> `
})
export class AppComponent implements OnInit, AfterViewInit {
  private config = inject(PROTEO_APP_CONF as InjectionToken<AppConfig>);
  isFullProteo = isFullProteo;
 
  ngOnInit(): void {
    LoggerUtils.getInstance().debug('[LoginApplication] AppComponent initialized');
    /**
     * If the token is present and the application is in full proteo mode, it sets the authorization.
     * This only works in the development environment.
     */
    if (this.isFullProteo()) {
      I18n.getInstance().use(Languages[(this.config as BaseAppConfig).APP_CONFIG.DEFAULT_LOCALE].language);
    } else {
      I18n.getInstance().use(LOGIN_LANGUAGES.SPANISH);

    }
    
  }

  ngAfterViewInit(): void {
    const loadingElement = document.querySelector('bs-loading');
    if (loadingElement) {
      loadingElement.classList.add('hidden');
    } else {
      LoggerUtils.getInstance().debug('[LoginApplication] Not exists initial loader element');
    }
  }
}
