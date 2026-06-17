import { UserMockMapper } from '../user-mock.mapper';
import { UserMockDto } from '../user-mock.dto';
import { InfoModel } from '../../../domain/models/info.model';

describe('UserMockMapper', () => {
  let userMockMapper: UserMockMapper;

  beforeEach(() => {
    userMockMapper = new UserMockMapper();
  });

  it('should map from UserMockDto to InfoModel', () => {
    const userMockDto: UserMockDto = {
      id: 1,
      name: 'John Doe',
      username: 'johndoe',
      email: 'john.doe@example.com',
      phone: '555-555-5555',
      website: 'johndoe.com'
    };

    const infoModel: InfoModel = userMockMapper.mapFrom(userMockDto);

    expect(infoModel).toEqual({
      name: 'John Doe'
    });
  });

  it('should map from InfoModel to UserMockDto', () => {
    const infoModel: InfoModel = {
      name: 'John Doe'
    };

    const userMockDto: UserMockDto = userMockMapper.mapTo(infoModel);

    expect(userMockDto).toEqual({
      id: 0,
      name: 'John Doe',
      username: '',
      email: '',
      phone: '',
      website: ''
    });
  });

  it('should handle empty UserMockDto', () => {
    const userMockDto: UserMockDto = {
      id: 0,
      name: '',
      username: '',
      email: '',
      phone: '',
      website: ''
    };

    const infoModel: InfoModel = userMockMapper.mapFrom(userMockDto);

    expect(infoModel).toEqual({
      name: ''
    });
  });

  it('should handle empty InfoModel', () => {
    const infoModel: InfoModel = {
      name: ''
    };

    const userMockDto: UserMockDto = userMockMapper.mapTo(infoModel);

    expect(userMockDto).toEqual({
      id: 0,
      name: '',
      username: '',
      email: '',
      phone: '',
      website: ''
    });
  });
});
