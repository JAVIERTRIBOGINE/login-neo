import { Observable, of, throwError } from 'rxjs';
import { GetInfoModel } from '../../domain/models/get-info.model';
import { InfoModel } from '../../domain/models/info.model';
import { InfoRepository } from '../../domain/repositories/info.repository';
import { GET_INFO_RESPONSE } from './fake-data';
import { UserMockMapper } from './user-mock.mapper';

export class InfoMockRepository implements InfoRepository {
  mapper = new UserMockMapper();

  getInfo(params: GetInfoModel): Observable<InfoModel> {
    const response = GET_INFO_RESPONSE.find((el) => el.id === params.id)?.response;
    if (response) {
      return of<InfoModel>(this.mapper.mapFrom(response));
    }
    return throwError(() => 'Error find mock response');
  }
}
