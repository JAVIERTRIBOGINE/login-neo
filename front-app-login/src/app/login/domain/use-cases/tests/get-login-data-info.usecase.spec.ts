import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { GetInfo } from '../get-info.usecase';
import { LoginDataInfoRepository } from '../../repositories/login-data-info.repository';
import { GetLoginDataInfo } from '../get-login-data-info.usecase';
import { ILoginData, LOGIN_DATA_FIELDS } from '../../models/login-data.model';
import { CALLBACK_PROPS_ENUM } from '../../constants/callbacks.enum';
import { TreeCallbackModel, ISuccessOtpRespone } from '../../models/Tree-callback.model';


describe('GetInfo UseCase', () => {
  let useCase: GetLoginDataInfo;
  let repository: jasmine.SpyObj<LoginDataInfoRepository>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('LoginDataInfoRepository', ['getLoginInfo']);

    TestBed.configureTestingModule({
      providers: [GetInfo, { provide: LoginDataInfoRepository, useValue: spy }]
    });

    useCase = TestBed.inject(GetLoginDataInfo);
    repository = TestBed.inject(LoginDataInfoRepository) as jasmine.SpyObj<LoginDataInfoRepository>;
  });

  it('should be created', () => {
    expect(useCase).toBeTruthy();
  });

  it('should call getInfo on the repository with correct parameters', () => {
    const params: ILoginData = {
        [LOGIN_DATA_FIELDS.DOCUMENT]: '11111A',
        [LOGIN_DATA_FIELDS.PHONE]: '666666111',
        [LOGIN_DATA_FIELDS.OTP]: '111111',
        [LOGIN_DATA_FIELDS.AUTH_ID]: '11111AAAAA',
        [LOGIN_DATA_FIELDS.CALL_MODE]: 'OTP',
    }
    
    const callBackResponse =  {
              authId: 'asdfasdfdasdf',
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
                  type: CALLBACK_PROPS_ENUM.PASSWORD_CALL_BACK,
                  input: [{ name: CALLBACK_PROPS_ENUM.ID_TOKEN_1, value: '111111' }],
                  output: [{ name: CALLBACK_PROPS_ENUM.PROMPT , value: CALLBACK_PROPS_ENUM.ONE_TIME_PASSWORD } ],
                  _id: 1
        
                }
              ],
              stage: CALLBACK_PROPS_ENUM.VALIDATE_SMS
            
            
          } as TreeCallbackModel&ISuccessOtpRespone

    repository.getLoginInfo.and.returnValue(of(callBackResponse));

    useCase.execute(params).subscribe((result) => {
      expect(result).toEqual(callBackResponse);
    });

    expect(repository.getLoginInfo).toHaveBeenCalledWith(params);
  });

  it('should handle repository errors', () => {
    const errorResponse = new Error('Repository error');
    const params: ILoginData = {
      [LOGIN_DATA_FIELDS.DOCUMENT]: '11111A',
      [LOGIN_DATA_FIELDS.PHONE]: '666666111',
      [LOGIN_DATA_FIELDS.OTP]: '111111',
      [LOGIN_DATA_FIELDS.AUTH_ID]: '11111AAAAA',
      [LOGIN_DATA_FIELDS.CALL_MODE]: 'OTP',
  }
    repository.getLoginInfo.and.returnValue(throwError(() => errorResponse));

    useCase.execute(params).subscribe({
      error: (error) => {
        expect(error).toEqual(errorResponse);
      }
    });

    expect(repository.getLoginInfo).toHaveBeenCalledWith(params);
  });
});
