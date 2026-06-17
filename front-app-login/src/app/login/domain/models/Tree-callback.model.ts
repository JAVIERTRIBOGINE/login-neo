import { ERROR_CODES_ENUM } from "../constants/callbacks.enum"

export interface TreeCallbackModel {
    authId?: string,
    callbacks?: CallbackModel[] | undefined,
    stage?: string,
}

export interface NameValueModel {
    name: string,
    value: string | Record<string, unknown> | IErrorCode
}

export interface CallbackModel {
    type: string,
    output: NameValueModel [],
    input?: NameValueModel [],
    _id?: number
};


export interface IErrorCode {
    errorCode: ERROR_CODES_ENUM
}

export interface ISuccessOtpRespone {
    successUrl: string,
    tokenId: string,
    realm: string
}
