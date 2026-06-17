import { Observable } from 'rxjs';
import { ISuccessOtpRespone, TreeCallbackModel } from '../models/Tree-callback.model';
import { ILoginData } from '../models/login-data.model';
export abstract class LoginDataInfoRepository {
  abstract getLoginInfo(params: ILoginData): Observable<TreeCallbackModel&ISuccessOtpRespone>;
}
