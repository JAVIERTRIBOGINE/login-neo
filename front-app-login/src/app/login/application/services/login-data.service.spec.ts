import { TestBed } from "@angular/core/testing"
import { LoginDataService } from "./login-data.service"
import {  ILoginData, LOGIN_DATA_FIELDS } from "@app/login/domain/models/login-data.model";
import { errorCode, INITIAL_LOGIN_DATA, INITIAL_SUCCESS_OTP_DATA } from "@app/login/domain/constants/login.data.constant";
import { ISuccessOtpRespone } from "@app/login/domain/models/Tree-callback.model";
import { CALLBACK_PROPS_ENUM, ERROR_CODES_ENUM } from "@app/login/domain/constants/callbacks.enum";


describe('LoginDataService', () => {
    let service: LoginDataService;

    beforeEach( async() => {
        TestBed.configureTestingModule({
            providers: [ LoginDataService]
        })
        service = TestBed.inject(LoginDataService);
        service.initValues()         
    })

    it('initCompleteData', () => {
        expect(service.stepLoginComplete()).toBeFalse()
        expect(service.stepOtpComplete()).toBeFalse()
        expect(service.stepSuccessComplete()).toBeFalse()
    })

    it('setLoginData', () => {
        const mockLoginData: ILoginData =  {
            [LOGIN_DATA_FIELDS.DOCUMENT]: '222333444',
            [LOGIN_DATA_FIELDS.PHONE]: '+34666555444'
        }
        service.setLoginData(mockLoginData);
        expect(service.loginData()).toEqual(mockLoginData)
    })

    it('setAuthId', () => {
        const mockAuthId =  'abcdefghi12345678'
        service.setAuthId(mockAuthId);
        expect(service.getCurrentAuthId()).toEqual(mockAuthId)
    })

    it('setSuccessData', () => {
        const mockSuccesOtpData: ISuccessOtpRespone = {
            successUrl: '/success-mock',
            tokenId: 'bcafgh897',
            realm: 'mockRealm'
        };
        service.setSuccessData(mockSuccesOtpData);
        expect(service.successData()).toEqual(mockSuccesOtpData)
        expect(service.getSuccessObject()).toEqual(mockSuccesOtpData)
    })

    it('setOTPData', () => {
        const mockOTPData: ILoginData = {
            [LOGIN_DATA_FIELDS.OTP]: 'abcdefghi12345678'} 
        service.setOTPData(mockOTPData[LOGIN_DATA_FIELDS.OTP]??'');
        expect(service.loginData()[LOGIN_DATA_FIELDS.OTP]).toEqual(mockOTPData[LOGIN_DATA_FIELDS.OTP])
    })

    it('initializeLoginState', () => {
        service.initializeLoginState();
        expect(service.loginData()).toEqual(INITIAL_LOGIN_DATA)
        expect(service.getCurrentAuthId()).toEqual('')
        expect(service.successData()).toEqual(INITIAL_SUCCESS_OTP_DATA)
    })

    it('setOtpCallback', () => {
        const mockCode = '55555';
        const mockAuthId = 'abcdefg12345';
        const mockPhoneValue =  '+34666555444';
        const mockLoginData: ILoginData =  {
            [LOGIN_DATA_FIELDS.DOCUMENT]: '222333444',
            [LOGIN_DATA_FIELDS.PHONE]: mockPhoneValue,
            [LOGIN_DATA_FIELDS.OTP]: mockCode,
            [LOGIN_DATA_FIELDS.CALL_MODE]: 'OTP',
            [LOGIN_DATA_FIELDS.AUTH_ID]: mockAuthId,
        };
        //service.setOTPData(mockCode)
        service.setLoginData(mockLoginData);
        const mockCallBackResponse =
           {
             authId: mockAuthId,
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
                        value: service.isCodeHyphon()? CALLBACK_PROPS_ENUM.RESEND_CODE: ""
                    }
                ],
                "_id": 1
            },
               {
                 type: CALLBACK_PROPS_ENUM.PASSWORD_CALL_BACK,
                 input: [{ name: CALLBACK_PROPS_ENUM.ID_TOKEN_3, value: mockCode} ],
                 output: [{ name: CALLBACK_PROPS_ENUM.PROMPT , value: CALLBACK_PROPS_ENUM.ONE_TIME_PASSWORD } ],
                 _id: 2
       
               }
             ],
             stage: CALLBACK_PROPS_ENUM.VALIDATE_SMS
        };

        expect(service.setOtpCallback()).toEqual(mockCallBackResponse)
    })

    it('setLoginCallback', () => {
        const mockDocumentNumber = '43734794H';
        const mockAuthId = 'abcdefg12345';
        const mockPhoneValue =  '666555444';
        const mockPrefixPhoneValue =  '+34';
        service.setLoginData({
            [LOGIN_DATA_FIELDS.AUTH_ID]: mockAuthId,
            [LOGIN_DATA_FIELDS.DOCUMENT]: mockDocumentNumber,
            [LOGIN_DATA_FIELDS.PHONE]: mockPrefixPhoneValue + "-" + mockPhoneValue,
            [LOGIN_DATA_FIELDS.CALL_MODE]: 'LOGIN'
        }
        )
        service.setAuthId(mockAuthId);
        const mockFinalCallBackLoginResponse =
        {
            authId: mockAuthId,
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
                        value:mockDocumentNumber
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
                        value:  mockPrefixPhoneValue
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
                            value:mockPhoneValue
                        }
                    ]
                } 
            ]
        };

        expect(service.setLoginCallback()).toEqual(mockFinalCallBackLoginResponse)
    })

    it('getError', () => {
        const errorMockResponse = "error mock";
        const otherMockResponse = "other response";
        spyOn(service.loginTranslationService, 'translateFromKey').and
        .callFake(key => {
            if(key===`${errorCode[ERROR_CODES_ENUM.WRONG_OTP_CODE]}`) 
                {return errorMockResponse} else {return otherMockResponse}
        });
        const mockAuthId = 'abcdefg12345';
        const mockErrorCallBackResponseOTPError =
        {
          authId: mockAuthId,
          callbacks: [
            {
              type: CALLBACK_PROPS_ENUM.META_DATA_CALLBACK,
              output: [
                  {
                      name: CALLBACK_PROPS_ENUM.DATA,
                      value: {errorCode: errorCode[ERROR_CODES_ENUM.WRONG_OTP_CODE]}
                  }
              ],
              _id: 0
            }
          ],
          stage: CALLBACK_PROPS_ENUM.VALIDATE_SMS
     };

     const mockErrorCallBackResponseNoError =
     {
       authId: mockAuthId,
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
         }
       ],
       stage: CALLBACK_PROPS_ENUM.VALIDATE_SMS
  };
      

    expect(service.getError(mockErrorCallBackResponseOTPError))
            .toEqual( otherMockResponse);

    expect(service.getError(mockErrorCallBackResponseNoError))
            .toEqual( otherMockResponse)
    })

    it("isCodeHyphon", () => {
        service.loginData.set({
            [LOGIN_DATA_FIELDS.OTP]: "-"
        })

        expect(service.isCodeHyphon()).toBeTrue();

        service.loginData.set({
            [LOGIN_DATA_FIELDS.OTP]: "111111"
        })

        expect(service.isCodeHyphon()).toBeFalse();

    })

    it("getProcedence", () => {
        const mockProcedence = "mockProcedence"
        service.setProcedence(mockProcedence);
        expect(service.getProcedence()).toEqual(mockProcedence)
    })

    it("getTealiumChannel", () => {
        const mockTeallium = "mockTeallium"
        service.setTealiumChannel(mockTeallium);
        expect(service.getTealiumChannel()).toEqual(mockTeallium)
    })

   


})