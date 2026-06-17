import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ISuccessOtpRespone } from '@app/login/domain/models/Tree-callback.model';
import { IKerberosAuthParams } from '@app/login/domain/models/authenticate-params.model';
import { KerberosAuthRepository } from '@app/login/domain/repositories/kerberos-auth.repository';
import { LoginTranslationService } from '@app/login/application/services/login-translation.service';
import { LoginDataService } from '@app/login/application/services/login-data.service';
import { environment } from 'src/environments/environment';

// HttpClient used directly — DataManager does not support withCredentials (required for SPNEGO)
export class KerberosAuthBackendRepository implements KerberosAuthRepository {

  private http = inject(HttpClient);
  private loginDataService = inject(LoginDataService);
  private loginTranslationService = inject(LoginTranslationService);

  kerberosAuth(params: IKerberosAuthParams): Observable<ISuccessOtpRespone> {
    const url = window.BsAuthorizationConfig?.url?.authenticate ?? environment.endpoints.authenticate;

    let headersObj: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept-Language': this.loginTranslationService.getLanguage(),
    };
    if (this.loginDataService.getProcedence()) headersObj['Procedence'] = this.loginDataService.getProcedence();

    return this.http.post<ISuccessOtpRespone>(
      url,
      { authId: params.authId, callbacks: params.callbacks },
      { headers: new HttpHeaders(headersObj), withCredentials: true }
    );
  }
}
