import { ILoginData, LOGIN_DATA_FIELDS } from "../models/login-data.model";
import { ISuccessOtpRespone, TreeCallbackModel } from "../models/Tree-callback.model";
import { ERROR_CODES_ENUM } from "./callbacks.enum";

export const INITIAL_LOGIN_DATA: ILoginData = {
    [LOGIN_DATA_FIELDS.DOCUMENT]: '',
    [LOGIN_DATA_FIELDS.PHONE]: '',
    [LOGIN_DATA_FIELDS.OTP]: '',
    [LOGIN_DATA_FIELDS.AUTH_ID]: '',
}

export const INITIAL_SUCCESS_OTP_DATA: ISuccessOtpRespone = {
    successUrl: '',
    tokenId: '',
    realm: ''
}


export const errorCode: Record<ERROR_CODES_ENUM, string> = {
    [ERROR_CODES_ENUM.WRONG_OTP_CODE]: "login:APP.ERROR_CALL.WRONG_OTP_CODE", 
    [ERROR_CODES_ENUM.UNDEFINED_ERROR]: "NO_ERROR",
    [ERROR_CODES_ENUM.EXPIRED_OTP_CODE]: "login:APP.ERROR_CALL.EXPIRED_OTP_CODE"
 }

 export const INITIAL_LOGIN_RESPONSE: TreeCallbackModel = {
    authId: '',
    callbacks: [],
    stage: ''
 }

 export const RetryTime = 60;