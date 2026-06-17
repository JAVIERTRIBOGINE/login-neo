import { filter, from, map, Observable, throwError } from "rxjs";
import { GetInfoModel } from "../../domain/models/get-info.model";
import { InfoModel } from "../../domain/models/info.model";
import { InfoRepository } from "../../domain/repositories/info.repository";
import { getDriver, hasDriver } from '@proteo/data-manager';
import { UserMapper } from "./user.mapper";
import { UserDto } from "./user.dto";

const EXTERNAL_DRIVER = 'EXTERNAL';
export class InfoBackendRepository implements InfoRepository {
	private userMapper = new UserMapper();

	getInfo(params: GetInfoModel): Observable<InfoModel> {
		// Check if exists driver in dataManager instance
		if (hasDriver(EXTERNAL_DRIVER)) {
			// Get driver from dataManager instance
			const mockDriver = getDriver(EXTERNAL_DRIVER);

			/**
			 * Use get<>() from dataManager for send request
			 * this function is a promise instead need observable,
			 * you can use from() from rxjs
			 */
			if (mockDriver) {
				return from(mockDriver.get<UserDto>(`users/${params.id}`)).pipe(
					filter((response) => !!response.data),
					map((response) => this.userMapper.mapFrom(response.data as UserDto)))
			}
		}
		return throwError(() => new Error('Error load driver in dataManager'));
	}
}