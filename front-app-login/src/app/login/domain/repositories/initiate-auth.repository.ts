import { Observable } from 'rxjs';
import { TreeCallbackModel } from '../models/Tree-callback.model';

export abstract class InitiateAuthRepository {
  abstract initiateAuth(): Observable<TreeCallbackModel>;
}
