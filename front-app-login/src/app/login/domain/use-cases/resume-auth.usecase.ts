import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UseCase } from '../../../base/use-case';
import { TreeCallbackModel } from '../models/Tree-callback.model';
import { IResumeAuthParams } from '../models/authenticate-params.model';
import { ResumeAuthRepository } from '../repositories/resume-auth.repository';

@Injectable({ providedIn: 'root' })
export class ResumeAuthUseCase implements UseCase<IResumeAuthParams, TreeCallbackModel> {

  repository: ResumeAuthRepository = inject(ResumeAuthRepository);

  execute(params: IResumeAuthParams): Observable<TreeCallbackModel> {
    return this.repository.resumeAuth(params);
  }
}
