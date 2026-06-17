import { inject } from '@angular/core';
import { filter, from, map, Observable, of } from 'rxjs';
import { getDriver, hasDriver } from '@proteo/data-manager';
import { DataManagerResponse } from '@proteo/types';
import { TreeCallbackModel } from '@app/login/domain/models/Tree-callback.model';
import { ResumeAuthRepository } from '@app/login/domain/repositories/resume-auth.repository';
import { IResumeAuthParams } from '@app/login/domain/models/authenticate-params.model';
import { LoginTranslationService } from '@app/login/application/services/login-translation.service';
import { LoginDataService } from '@app/login/application/services/login-data.service';
import { environment } from 'src/environments/environment';

const DRIVER = 'PARTY_AUTHENTICATION';

export class ResumeAuthBackendRepository implements ResumeAuthRepository {

  private loginDataService = inject(LoginDataService);
  private loginTranslationService = inject(LoginTranslationService);

  resumeAuth(params: IResumeAuthParams): Observable<TreeCallbackModel> {
    if (!hasDriver(DRIVER)) return of({} as TreeCallbackModel);

    const driver = getDriver(DRIVER)!;
    const url = window.BsAuthorizationConfig?.url?.authenticate ?? environment.endpoints.authenticate;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept-Language': this.loginTranslationService.getLanguage(),
    };
    if (this.loginDataService.getProcedence()) headers['Procedence'] = this.loginDataService.getProcedence();

    return from(driver.post<TreeCallbackModel>(url, { authId: params.authId }, headers)).pipe(
      filter((response: DataManagerResponse<TreeCallbackModel>) => !!response.data),
      map(response => response.data as TreeCallbackModel)
    );
  }
}
