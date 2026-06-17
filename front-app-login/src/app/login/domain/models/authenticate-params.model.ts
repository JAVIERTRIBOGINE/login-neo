import { CallbackModel } from './Tree-callback.model';

export interface IResumeAuthParams {
  authId: string;
}

export interface IKerberosAuthParams {
  authId: string;
  callbacks: CallbackModel[];
}

export interface ICredentialsAuthParams {
  authId: string;
  username: string;
  password: string;
}
