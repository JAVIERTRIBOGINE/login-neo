import { Observable } from 'rxjs';
import { ISuccessOtpRespone } from '../models/Tree-callback.model';
import { IKerberosAuthParams } from '../models/authenticate-params.model';

export abstract class KerberosAuthRepository {
  abstract kerberosAuth(params: IKerberosAuthParams): Observable<ISuccessOtpRespone>;
}
