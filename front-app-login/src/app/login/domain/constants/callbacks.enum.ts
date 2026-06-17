export enum CALLBACK_PROPS_ENUM {
    NAME_CALLBACK = 'NameCallback',
    TEXT_INPUT_CALLBACK = 'TextInputCallback',
    ID_TOKEN_1 = 'IDToken1',
    ID_TOKEN_2 = 'IDToken2',
    ID_TOKEN_3 = 'IDToken3',
    META_DATA_CALLBACK = 'MetadataCallback',
    PASSWORD_CALL_BACK = 'PasswordCallback',
    DATA = 'data',
    PROMPT = "prompt",
    ONE_TIME_PASSWORD = "One Time Password",
    VALIDATE_SMS = "validate-sms",
    DEFAULT_TEXT = "defaultText",
    NIF_NIE =  "NIF/NIE",
    PHONE_LITERAL = "Número de teléfono",
    PREFIX_LITERAL = "Prefijo teléfono",
    RESEND_CODE = "resend"
}

export enum ERROR_CODES_ENUM {
    WRONG_OTP_CODE = "WRONG_OTP_CODE", 
    UNDEFINED_ERROR = "UNDEFINED_ERROR",
    EXPIRED_OTP_CODE = "EXPIRED_OTP_CODE"
}