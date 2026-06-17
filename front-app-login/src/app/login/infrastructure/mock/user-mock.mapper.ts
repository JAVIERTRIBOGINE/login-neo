import { Mapper } from "src/app/base/mapper";
import { InfoModel } from "../../domain/models/info.model";
import { UserMockDto } from "./user-mock.dto";

export class UserMockMapper implements Mapper<UserMockDto, InfoModel> {
  mapFrom(param: UserMockDto): InfoModel {
    return {
      name: param.name
    }
  }
  mapTo(param: InfoModel): UserMockDto {
    return {
      id: 0,
      name: param.name,
      username: '',
      email: '',
      phone: '',
      website: '',
    }
  }

}