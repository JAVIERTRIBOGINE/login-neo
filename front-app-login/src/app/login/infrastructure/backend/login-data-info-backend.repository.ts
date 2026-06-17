import { filter, from, map, Observable, of, switchMap, tap } from "rxjs";
import { getDriver, hasDriver } from '@proteo/data-manager';
import { ISuccessOtpRespone, TreeCallbackModel } from "@app/login/domain/models/Tree-callback.model";
import { LoginDataInfoRepository } from "@app/login/domain/repositories/login-data-info.repository";
import { DataManagerResponse } from "@proteo/types";
import { DataManagerDriver } from "@proteo/data-manager-driver";
import { ILoginData, LOGIN_DATA_FIELDS } from "@app/login/domain/models/login-data.model";
import { inject } from "@angular/core";
import { LoginDataService } from "@app/login/application/services/login-data.service";
import { LoginTranslationService } from "@app/login/application/services/login-translation.service";
import { environment } from "src/environments/environment";

const EXTERNAL_DRIVER = 'PARTY_AUTHENTICATION';

export class InfoLoginDataBackendRepository implements LoginDataInfoRepository {

	private loginDataService:LoginDataService;
	private loginTranslationService:LoginTranslationService;

	constructor() {
		this.loginDataService = inject(LoginDataService)
		this.loginTranslationService = inject(LoginTranslationService)
	}

	hasCurrentDriver() {
		return hasDriver(EXTERNAL_DRIVER)
	};

	makeCall(authDriver: DataManagerDriver, body: TreeCallbackModel){
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			'Accept-Language': this.loginTranslationService.getLanguage(),
		  };
		  
		if (this.loginDataService.getProcedence() ) headers['Procedence'] = this.loginDataService.getProcedence();

		return from(authDriver.post<TreeCallbackModel>( window.BsAuthorizationConfig?.url?.authenticate?? environment.endpoints.authenticate, body, headers)).pipe(
			filter((response: DataManagerResponse<TreeCallbackModel>) => !!response.data),
			map(response =>  response.data as TreeCallbackModel& ISuccessOtpRespone))
	}

	getLoginInfo(params: ILoginData): Observable<TreeCallbackModel & ISuccessOtpRespone> {
		let loginCall: Observable<TreeCallbackModel&ISuccessOtpRespone> = of({} as TreeCallbackModel&ISuccessOtpRespone);

		 if (this.hasCurrentDriver()) {
			  const authDriver = getDriver('PARTY_AUTHENTICATION');
			  let body: TreeCallbackModel;
			  let data: ILoginData;
			  if (authDriver) {
				switch (params[LOGIN_DATA_FIELDS.CALL_MODE]) {
					case 'LOGIN':
						loginCall = this.makeCall(authDriver, {}).pipe(
							switchMap( (response: TreeCallbackModel) => { 
								 data =  {
									[LOGIN_DATA_FIELDS.AUTH_ID]: response.authId,
									[LOGIN_DATA_FIELDS.DOCUMENT]: params[LOGIN_DATA_FIELDS.DOCUMENT],
									[LOGIN_DATA_FIELDS.PHONE]: params[LOGIN_DATA_FIELDS.PHONE],
								} as ILoginData;

								this.loginDataService.setLoginData(data)
				
								body = this.loginDataService.setLoginCallback()
								return this.makeCall(authDriver, body).pipe(
								tap( response => this.loginDataService.setAuthId(response?.authId??'')))
							}
						))
					break;
					case 'OTP':
						this.loginDataService.setOTPData(params[LOGIN_DATA_FIELDS.OTP]??'')
						body = this.loginDataService.setOtpCallback()
						loginCall = this.makeCall(authDriver, body) 
					break;
				}	  
				return loginCall  
			} 
		}
		return of({} as TreeCallbackModel&ISuccessOtpRespone)
	}
}
