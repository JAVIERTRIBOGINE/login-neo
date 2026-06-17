import {  inject, Injectable } from '@angular/core';
import { UseCase } from '../../../base/use-case';
import { Observable } from 'rxjs';
import { ISuccessOtpRespone, TreeCallbackModel } from '../models/Tree-callback.model';
import { ILoginData } from '../models/login-data.model';
import { LoginDataInfoRepository } from '../repositories/login-data-info.repository';

@Injectable({
  providedIn: 'root',
})
export class GetLoginDataInfo implements UseCase<ILoginData, TreeCallbackModel> {

  repository: LoginDataInfoRepository = inject(LoginDataInfoRepository)

  execute(params: ILoginData): Observable<TreeCallbackModel&ISuccessOtpRespone> {
    return this.repository.getLoginInfo(params);
  }

 
  
}
