import { Observable } from 'rxjs';
import { TreeCallbackModel } from '../models/Tree-callback.model';
import { IResumeAuthParams } from '../models/authenticate-params.model';

export abstract class ResumeAuthRepository {
  abstract resumeAuth(params: IResumeAuthParams): Observable<TreeCallbackModel>;
}
