import { TestBed } from '@angular/core/testing';
import { InfoLoginDataBackendRepository } from '../login-data-info-backend.repository';
import {  getDriver, initialize } from '@proteo/data-manager';
import { LoggerUtils } from '@proteo/logger-utils';
import { ILoginData, LOGIN_DATA_FIELDS } from '@app/login/domain/models/login-data.model';
import { LoginDataService } from '@app/login/application/services/login-data.service';
import { ISuccessOtpRespone, TreeCallbackModel } from '@app/login/domain/models/Tree-callback.model';
import { LoginTranslationService } from '@app/login/application/services/login-translation.service';
import { of, switchMap, tap, throwError } from 'rxjs';

jasmine.createSpyObj(LoggerUtils, ['log', 'error', 'warn', 'info', 'debug']);

describe('InfoLoginDataBackendRepository', () => {
  let repository: InfoLoginDataBackendRepository;

  beforeAll(async () => {
    await initialize({
      EXTERNAL : {
      HOST: "https://jsonplaceholder.typicode.com",
      BASE_PATH: "/",
      DRIVER: "P4"
    },
    });

  });

  beforeEach(() => {
   TestBed.configureTestingModule({
      providers:[InfoLoginDataBackendRepository, LoginDataService, LoginTranslationService]
    });
      repository = TestBed.inject(InfoLoginDataBackendRepository);
  });

  it('should be created', () => {
    expect(repository).toBeTruthy();
  });

  xit("console no hay hasDriver", (done: DoneFn) => {
    spyOn(window.console, 'log');
    const params: ILoginData = {
      [LOGIN_DATA_FIELDS.DOCUMENT]: '11111A',
      [LOGIN_DATA_FIELDS.PHONE]: '666666111',
      [LOGIN_DATA_FIELDS.AUTH_ID]: '11111AAAAA',
      [LOGIN_DATA_FIELDS.CALL_MODE]: 'LOGIN',
  }

   const resultObs = repository.getLoginInfo(params);
     
   resultObs.subscribe(result => expect(result).toEqual({} as TreeCallbackModel&ISuccessOtpRespone))
    expect(window.console.log).toHaveBeenCalled();
    done();
  })




  it('call to LOGIN mode', (done: DoneFn) => {
    const mockDriver = getDriver('PARTY_AUTHENTICATION')!
    const params: ILoginData = {
      [LOGIN_DATA_FIELDS.DOCUMENT]: '11111A',
      [LOGIN_DATA_FIELDS.PHONE]: '666666111',
      [LOGIN_DATA_FIELDS.AUTH_ID]: '11111AAAAA',
      [LOGIN_DATA_FIELDS.CALL_MODE]: 'LOGIN',
  }
    
  spyOn(repository, 'hasCurrentDriver').and.returnValue(true);

  spyOn(repository['loginDataService'], 'setLoginData').and.callThrough();
  spyOn(repository['loginDataService'], 'setLoginCallback').and.callThrough();
  spyOn(repository['loginDataService'], 'setResponseObject').and.callThrough();

    
  spyOn(repository, 'makeCall').and.callFake((_driver, body) => {
     if (!body || Object.keys(body).length === 0) {
        return of({ } as TreeCallbackModel&ISuccessOtpRespone); // First call
      } else {
        return of({ } as TreeCallbackModel&ISuccessOtpRespone); // Second call
      }
   });
  
   
const loginCall$ = repository.makeCall(mockDriver, {}).pipe(
   switchMap((response: TreeCallbackModel) => {
   const data = {
   [LOGIN_DATA_FIELDS.AUTH_ID]: response.authId,
   [LOGIN_DATA_FIELDS.DOCUMENT]: params[LOGIN_DATA_FIELDS.DOCUMENT],
   [LOGIN_DATA_FIELDS.PHONE]: params[LOGIN_DATA_FIELDS.PHONE],
   };
  
   repository['loginDataService'].setLoginData(data);
  
   const body = repository['loginDataService'].setLoginCallback();
   return repository.makeCall(mockDriver, body).pipe(
   tap(response => repository['loginDataService'].setResponseObject(response))
   );
   })
   );
  
   loginCall$.subscribe({
   next: () => {
   expect(repository.makeCall).toHaveBeenCalledTimes(2);
   expect(repository['loginDataService'].setLoginData).toHaveBeenCalled();
   expect(repository['loginDataService'].setLoginCallback).toHaveBeenCalled();
   expect(repository['loginDataService'].setResponseObject).toHaveBeenCalled();
   done();
   }
   });
  
  });

  xit('call to OTP mode', () => {
    const params: ILoginData = {
      [LOGIN_DATA_FIELDS.DOCUMENT]: '11111A',
      [LOGIN_DATA_FIELDS.PHONE]: '666666111',
      [LOGIN_DATA_FIELDS.AUTH_ID]: '11111AAAAA',
      [LOGIN_DATA_FIELDS.CALL_MODE]: 'OTP',
  }
    
    spyOn(repository, 'hasCurrentDriver').and.returnValue(true);
    spyOn(repository['loginDataService'], 'setOTPData')
    repository.getLoginInfo(params);
    expect(repository['loginDataService'].setOTPData).toHaveBeenCalled()
  })

  it('call to OTP mode with NO driver' , (done: DoneFn) => {
    const params: ILoginData = {
      [LOGIN_DATA_FIELDS.DOCUMENT]: '11111A',
      [LOGIN_DATA_FIELDS.PHONE]: '666666111',
      [LOGIN_DATA_FIELDS.AUTH_ID]: '11111AAAAA',
      [LOGIN_DATA_FIELDS.CALL_MODE]: 'OTP',
  }
    
    spyOn(repository, 'hasCurrentDriver').and.returnValue(false);
    const loginReponse = repository.getLoginInfo(params)
    loginReponse.subscribe(data => {
      expect(data).toEqual({} as  TreeCallbackModel&ISuccessOtpRespone);
      done()
    });
  })

  it('should throw error if driver exists but get method fails', (done: DoneFn) => {
    spyOn(repository, 'getLoginInfo').and.returnValue(throwError(
      () => 'Network error'
    ))
    
    const params: ILoginData = {
      [LOGIN_DATA_FIELDS.DOCUMENT]: '11111A',
      [LOGIN_DATA_FIELDS.PHONE]: '666666111',
      [LOGIN_DATA_FIELDS.OTP]: '111111',
      [LOGIN_DATA_FIELDS.AUTH_ID]: '11111AAAAA',
      [LOGIN_DATA_FIELDS.CALL_MODE]: 'OTP',
  }

    repository.getLoginInfo(params).subscribe({
      error: (error) => {
        expect(error).toBe('Network error');
        done()
      }
    });
  });

  afterAll(() => {
    window.BsDataManager = { driversMap: new Map(), pendingConfigsMap: new Map() };
  });
});

describe('InfoLoginDataBackendRepository - DataManager not initialize', () => {
  
  let repository: InfoLoginDataBackendRepository;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers:[InfoLoginDataBackendRepository, LoginDataService, LoginTranslationService]

    });
    repository = TestBed.inject(InfoLoginDataBackendRepository);

    await initialize({
      FAKE: {
        HOST: 'http://localhost:4200/proxy',
        BASE_PATH: '/',
        DRIVER: 'HTTP'
      }
    });
  });

  it('should throw error if driver does not exist', () => {
const params: ILoginData = {
    [LOGIN_DATA_FIELDS.DOCUMENT]: '',
    [LOGIN_DATA_FIELDS.PHONE]: '',
    [LOGIN_DATA_FIELDS.OTP]: '',
    [LOGIN_DATA_FIELDS.AUTH_ID]: '',
}
    repository.getLoginInfo(params).subscribe({
      error: (error) => {
        expect(error).toBe('Error load driver in dataManager');
      }
    });
  });
});
