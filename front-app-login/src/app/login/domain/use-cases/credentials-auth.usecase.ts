import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UseCase } from '../../../base/use-case';
import { ISuccessOtpRespone } from '../models/Tree-callback.model';
import { ICredentialsAuthParams } from '../models/authenticate-params.model';
import { CredentialsAuthRepository } from '../repositories/credentials-auth.repository';

@Injectable({ providedIn: 'root' })
export class CredentialsAuthUseCase implements UseCase<ICredentialsAuthParams, ISuccessOtpRespone> {

  repository: CredentialsAuthRepository = inject(CredentialsAuthRepository);

  execute(params: ICredentialsAuthParams): Observable<ISuccessOtpRespone> {
    return this.repository.credentialsAuth(params);
  }
}
