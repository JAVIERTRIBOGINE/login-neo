import { UserMockDto } from './user-mock.dto';

interface GetInfoMockModel {
  id: number;
  response: UserMockDto;
}

export const GET_INFO_RESPONSE: GetInfoMockModel[] = [
  {
    id: 4,
    response: {
      id: 1004,
      name: 'User 4 Mock',
      username: 'username4',
      email: 'email4',
      phone: 'phone4',
      website: 'web4'
    }
  },
  {
    id: 1,
    response: {
      id: 1001,
      name: 'User 1 Mock',
      username: 'username1',
      email: 'email1',
      phone: 'phone1',
      website: 'web1'
    }
  }
];
