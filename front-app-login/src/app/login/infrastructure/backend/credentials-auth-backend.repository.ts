import { inject } from '@angular/core';
import { filter, from, map, Observable, of } from 'rxjs';
import { getDriver, hasDriver } from '@proteo/data-manager';
import { DataManagerResponse } from '@proteo/types';
import { ISuccessOtpRespone, TreeCallbackModel } from '@app/login/domain/models/Tree-callback.model';
import { CredentialsAuthRepository } from '@app/login/domain/repositories/credentials-auth.repository';
import { ICredentialsAuthParams } from '@app/login/domain/models/authenticate-params.model';
import { LoginTranslationService } from '@app/login/application/services/login-translation.service';
import { LoginDataService } from '@app/login/application/services/login-data.service';
import { environment } from 'src/environments/environment';

const DRIVER = 'PARTY_AUTHENTICATION';

export class CredentialsAuthBackendRepository implements CredentialsAuthRepository {

  private loginDataService = inject(LoginDataService);
  private loginTranslationService = inject(LoginTranslationService);

  credentialsAuth(params: ICredentialsAuthParams): Observable<ISuccessOtpRespone> {
    if (!hasDriver(DRIVER)) return of({} as ISuccessOtpRespone);

    const driver = getDriver(DRIVER)!;
    const url = window.BsAuthorizationConfig?.url?.authenticate ?? environment.endpoints.authenticate;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept-Language': this.loginTranslationService.getLanguage(),
    };
    if (this.loginDataService.getProcedence()) headers['Procedence'] = this.loginDataService.getProcedence();

    const body: TreeCallbackModel = {
      authId: params.authId,
      callbacks: [
        {
          type: 'NameCallback',
          output: [{ name: 'prompt', value: 'User Name' }],
          input:  [{ name: 'IDToken1', value: params.username }],
        },
        {
          type: 'PasswordCallback',
          output: [{ name: 'prompt', value: 'Password' }],
          input:  [{ name: 'IDToken2', value: params.password }],
        },
      ],
    };

    return from(driver.post<ISuccessOtpRespone>(url, body, headers)).pipe(
      filter((response: DataManagerResponse<ISuccessOtpRespone>) => !!response.data),
      map(response => response.data as ISuccessOtpRespone)
    );
  }
}
