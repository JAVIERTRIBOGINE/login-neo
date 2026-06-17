import { TreeCallbackModel } from "./Tree-callback.model";

export interface GetInfoLoginDataModel {
    authId: string;
    // loginData: ILoginData,
    callbacks: TreeCallbackModel[]
}