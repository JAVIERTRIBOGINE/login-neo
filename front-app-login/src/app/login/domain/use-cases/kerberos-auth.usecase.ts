import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UseCase } from '../../../base/use-case';
import { ISuccessOtpRespone } from '../models/Tree-callback.model';
import { IKerberosAuthParams } from '../models/authenticate-params.model';
import { KerberosAuthRepository } from '../repositories/kerberos-auth.repository';

@Injectable({ providedIn: 'root' })
export class KerberosAuthUseCase implements UseCase<IKerberosAuthParams, ISuccessOtpRespone> {

  repository: KerberosAuthRepository = inject(KerberosAuthRepository);

  execute(params: IKerberosAuthParams): Observable<ISuccessOtpRespone> {
    return this.repository.kerberosAuth(params);
  }
}
