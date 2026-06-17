import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UseCase } from '../../../base/use-case';
import { TreeCallbackModel } from '../models/Tree-callback.model';
import { InitiateAuthRepository } from '../repositories/initiate-auth.repository';

@Injectable({ providedIn: 'root' })
export class InitiateAuthUseCase implements UseCase<void, TreeCallbackModel> {

  repository: InitiateAuthRepository = inject(InitiateAuthRepository);

  execute(): Observable<TreeCallbackModel> {
    return this.repository.initiateAuth();
  }
}
