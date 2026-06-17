
import { Injectable, signal, WritableSignal, computed, Signal, inject } from '@angular/core';
import {  CALLBACK_PROPS_ENUM, ERROR_CODES_ENUM } from '@app/login/domain/constants/callbacks.enum';
import { errorCode, INITIAL_LOGIN_DATA, INITIAL_SUCCESS_OTP_DATA } from '@app/login/domain/constants/login.data.constant';
import { ILoginData, LOGIN_DATA_FIELDS} from '@app/login/domain/models/login-data.model';
import {  IErrorCode, ISuccessOtpRespone, TreeCallbackModel } from '@app/login/domain/models/Tree-callback.model';
import { LoginTranslationService } from './login-translation.service';
import { CHANEL_DEFAULT, PROCEDENCE_DEFAULT } from '@app/login/domain/constants/global.constants';

@Injectable({
  providedIn: 'root'
})
export class LoginDataService {

  private currentAuthId: WritableSignal<string> = signal('')
  loginResponseObject: WritableSignal<TreeCallbackModel|ISuccessOtpRespone> = signal({} as TreeCallbackModel)
  loginData!: WritableSignal<ILoginData>
  stepLoginComplete!: Signal<boolean> 
  stepOtpComplete!: Signal<boolean> 
  successData!: WritableSignal<ISuccessOtpRespone>
  stepSuccessComplete!: Signal<boolean>
  loginTranslationService!:LoginTranslationService;
  procedence: WritableSignal<string> = signal("")
  tealiumChanel: WritableSignal<string> = signal("")


  constructor() {
    this.initValues();
    this.loginTranslationService = inject(LoginTranslationService);
    

  }

  initValues() {
    this.currentAuthId= signal('');
    this.loginData = signal(INITIAL_LOGIN_DATA);
    this.stepLoginComplete = computed(() => this.loginData()[LOGIN_DATA_FIELDS.DOCUMENT] !== '');
    this.stepOtpComplete= computed(() => this.loginData()[LOGIN_DATA_FIELDS.OTP] !=='');
    this.successData = signal(INITIAL_SUCCESS_OTP_DATA);
    this.stepSuccessComplete = computed(() => this.successData().realm !=='');
  }
  
  setLoginData(data: ILoginData) {
    this.setAuthId(data[LOGIN_DATA_FIELDS.AUTH_ID] ??'')
    this.loginData.set(data)
  }

  setResponseObject(data: TreeCallbackModel){
    this.loginResponseObject.set(data)
  }

  setAuthId(authId: string) {
    this.currentAuthId.set(authId)
  }

  getCurrentAuthId(){
    return this.currentAuthId();
  }

  setSuccessData(data:ISuccessOtpRespone) {
    localStorage.setItem("token_id", data.tokenId)
    this.successData.set(data)
  }

  setOTPData(otp:string) {
    this.loginData.update((data:ILoginData) => ({...data, ...{[LOGIN_DATA_FIELDS.OTP] : otp}}))
  }

  initializeLoginState(){
    this.loginData.set(INITIAL_LOGIN_DATA);
    this.currentAuthId.set('')
    this.successData.set(INITIAL_SUCCESS_OTP_DATA)
  }

  setLoginCallback(/*response: TreeCallbackModel*/) {

    const callBackResponse =
    {
      authId: this.getCurrentAuthId(),
      callbacks: 
      [
          {
              type: CALLBACK_PROPS_ENUM.NAME_CALLBACK,
              output: [
                  {
                      name: CALLBACK_PROPS_ENUM.PROMPT,
                      value: CALLBACK_PROPS_ENUM.NIF_NIE
                  }
              ],
              input: [
                  {
                      name: CALLBACK_PROPS_ENUM.ID_TOKEN_1,
                      value: this.loginData()[LOGIN_DATA_FIELDS.DOCUMENT]
                  }
              ]
          },
          {
            type: CALLBACK_PROPS_ENUM.TEXT_INPUT_CALLBACK,
            output: [
                {
                  name: CALLBACK_PROPS_ENUM.PROMPT,
                  value: CALLBACK_PROPS_ENUM.PREFIX_LITERAL
                },
                {
                    name: CALLBACK_PROPS_ENUM.DEFAULT_TEXT,
                    value: ""
                }
            ],
            input: [
                {
                    name: CALLBACK_PROPS_ENUM.ID_TOKEN_2,
                    value:  this.loginData()[LOGIN_DATA_FIELDS.PHONE]?.split('-')[0]
                }
            ]
        },
        {
              type: CALLBACK_PROPS_ENUM.TEXT_INPUT_CALLBACK,
              output: [
                  {
                    name: CALLBACK_PROPS_ENUM.PROMPT,
                    value: CALLBACK_PROPS_ENUM.PHONE_LITERAL
                  },
                  {
                      name: CALLBACK_PROPS_ENUM.DEFAULT_TEXT,
                      value: ""
                  }
              ],
              input: [
                  {
                      name: CALLBACK_PROPS_ENUM.ID_TOKEN_3,
                      value:  this.loginData()[LOGIN_DATA_FIELDS.PHONE]?.split('-')[1]
                  }
              ]
        }
        
      ]
    };
    return callBackResponse as TreeCallbackModel
  }

  setOtpCallback() {
    const callBackResponse =
    {
      authId: this.getCurrentAuthId(),
      callbacks: [
        {
          type: CALLBACK_PROPS_ENUM.META_DATA_CALLBACK,
          output: [
              {
                  name: CALLBACK_PROPS_ENUM.DATA,
                  value: {}
              }
          ],
          _id: 0
        },
        {
          type: CALLBACK_PROPS_ENUM.TEXT_INPUT_CALLBACK,
          output: [
              {
                  name: CALLBACK_PROPS_ENUM.PROMPT,
                  value: "Resend OTP"
              },
              {
                  name: "defaultText",
                  value: ""
              }
          ],
          input: [
              {
                  name: CALLBACK_PROPS_ENUM.ID_TOKEN_2,
                  value: this.isCodeHyphon()? CALLBACK_PROPS_ENUM.RESEND_CODE: ""
              }
          ],
          "_id": 1
      },
        {
          type: CALLBACK_PROPS_ENUM.PASSWORD_CALL_BACK,
          input: [{ name: CALLBACK_PROPS_ENUM.ID_TOKEN_3, value:  this.loginData()[LOGIN_DATA_FIELDS.OTP]} ],
          output: [{ name: CALLBACK_PROPS_ENUM.PROMPT , value: CALLBACK_PROPS_ENUM.ONE_TIME_PASSWORD } ],
          _id: 2
        }
      ],
      stage: CALLBACK_PROPS_ENUM.VALIDATE_SMS
    };
    return callBackResponse as TreeCallbackModel
  }

  isCodeHyphon() {
    return this.loginData()[LOGIN_DATA_FIELDS.OTP] === "-"
  }

  

  getSuccessObject() {
    return this.successData();
  }

  getError(callback: TreeCallbackModel): string {
    const metadata_callback = callback?.callbacks?.filter(item => item.type === CALLBACK_PROPS_ENUM.META_DATA_CALLBACK)[0];
    if ((metadata_callback?.output[0].value as IErrorCode).errorCode !== undefined) {
      const errorCodeKey =( metadata_callback?.output[0].value as IErrorCode).errorCode as ERROR_CODES_ENUM;
      const errorKeyTranslation = errorCode[errorCodeKey]
      return this.loginTranslationService.translateFromKey(errorKeyTranslation )
    }
    return this.loginTranslationService.translateFromKey(`${errorCode[ERROR_CODES_ENUM.UNDEFINED_ERROR]}`)
  }

  getProcedence(): string {
    return this.procedence();
  }

  getTealiumChannel(): string {
    return this.tealiumChanel();
  }

  setProcedence(procd: string) {
    this.procedence.set(procd || PROCEDENCE_DEFAULT);
  }

  setTealiumChannel(orig: string) {
    this.tealiumChanel.set(orig || CHANEL_DEFAULT);
  }

}