import { Injectable } from '@angular/core';
import { UseCase } from '../../../base/use-case';
import { Observable } from 'rxjs';
import { InfoModel } from '../models/info.model';
import { GetInfoModel } from '../models/get-info.model';
import { InfoRepository } from '../repositories/info.repository';

@Injectable({
  providedIn: 'root'
})

export class GetInfo implements UseCase<GetInfoModel, InfoModel> {
  constructor(private repository: InfoRepository) { }

  execute(params: GetInfoModel): Observable<InfoModel> {
    return this.repository.getInfo(params);
  }
}
