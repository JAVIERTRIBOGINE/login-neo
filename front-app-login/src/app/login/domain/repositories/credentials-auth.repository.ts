import { Observable } from 'rxjs';
import { ISuccessOtpRespone } from '../models/Tree-callback.model';
import { ICredentialsAuthParams } from '../models/authenticate-params.model';

export abstract class CredentialsAuthRepository {
  abstract credentialsAuth(params: ICredentialsAuthParams): Observable<ISuccessOtpRespone>;
}
