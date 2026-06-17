import { Observable } from 'rxjs';
import { GetInfoModel } from '../models/get-info.model';
import { InfoModel } from '../models/info.model';
export abstract class InfoRepository {
  abstract getInfo(params: GetInfoModel): Observable<InfoModel>;
}
