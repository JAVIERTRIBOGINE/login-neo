import { Mapper } from "src/app/base/mapper";
import { InfoModel } from "../../domain/models/info.model";
import { UserDto } from "./user.dto";

export class UserMapper implements Mapper<UserDto, InfoModel> {
  mapFrom(param: UserDto): InfoModel {
    return {
      name: param.name
    }
  }
  mapTo(param: InfoModel): UserDto {
    return {
      id: 0,
      name: param.name,
      username: '',
      email: '',
      address: {
        street: '',
        suite: '',
        city: '',
        zipcode: '',
        geo: {
          lat: '',
          lng: '',
        }
      },
      phone: '',
      website: '',
      company: {
        name: '',
        catchPhrase: '',
        bs: '',
      },
    }
  }

}
