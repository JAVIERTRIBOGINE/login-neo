export enum LOGIN_DATA_FIELDS { DOCUMENT, PHONE, OTP, AUTH_ID, CALL_MODE }

export interface ILoginData  {
    [LOGIN_DATA_FIELDS.DOCUMENT]?: string,
    [LOGIN_DATA_FIELDS.PHONE]?: string
    [LOGIN_DATA_FIELDS.OTP]?: string
    [LOGIN_DATA_FIELDS.AUTH_ID]?: string
    [LOGIN_DATA_FIELDS.CALL_MODE]?: string
}
