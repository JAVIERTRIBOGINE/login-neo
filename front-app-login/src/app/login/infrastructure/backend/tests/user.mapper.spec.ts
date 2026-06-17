import { UserMapper } from '../user.mapper';
import { UserDto } from '../user.dto';
import { InfoModel } from '../../../domain/models/info.model';

describe('UserMapper', () => {
  let userMapper: UserMapper;

  beforeEach(() => {
    userMapper = new UserMapper();
  });

  it('should map from UserDto to InfoModel', () => {
    const userDto: UserDto = {
      id: 1,
      name: 'John Doe',
      username: 'johndoe',
      email: 'john.doe@example.com',
      address: {
        street: '123 Main St',
        suite: 'Apt 1',
        city: 'Anytown',
        zipcode: '12345',
        geo: {
          lat: '0.0000',
          lng: '0.0000'
        }
      },
      phone: '555-555-5555',
      website: 'johndoe.com',
      company: {
        name: 'Doe Inc.',
        catchPhrase: 'Innovate and Lead',
        bs: 'business stuff'
      }
    };

    const infoModel: InfoModel = userMapper.mapFrom(userDto);

    expect(infoModel).toEqual({
      name: 'John Doe'
    });
  });

  it('should map from InfoModel to UserDto', () => {
    const infoModel: InfoModel = {
      name: 'John Doe'
    };

    const userDto: UserDto = userMapper.mapTo(infoModel);

    expect(userDto).toEqual({
      id: 0,
      name: 'John Doe',
      username: '',
      email: '',
      address: {
        street: '',
        suite: '',
        city: '',
        zipcode: '',
        geo: {
          lat: '',
          lng: ''
        }
      },
      phone: '',
      website: '',
      company: {
        name: '',
        catchPhrase: '',
        bs: ''
      }
    });
  });

  it('should handle empty UserDto', () => {
    const userDto: UserDto = {
      id: 0,
      name: '',
      username: '',
      email: '',
      address: {
        street: '',
        suite: '',
        city: '',
        zipcode: '',
        geo: {
          lat: '',
          lng: ''
        }
      },
      phone: '',
      website: '',
      company: {
        name: '',
        catchPhrase: '',
        bs: ''
      }
    };

    const infoModel: InfoModel = userMapper.mapFrom(userDto);

    expect(infoModel).toEqual({
      name: ''
    });
  });

  it('should handle empty InfoModel', () => {
    const infoModel: InfoModel = {
      name: ''
    };

    const userDto: UserDto = userMapper.mapTo(infoModel);

    expect(userDto).toEqual({
      id: 0,
      name: '',
      username: '',
      email: '',
      address: {
        street: '',
        suite: '',
        city: '',
        zipcode: '',
        geo: {
          lat: '',
          lng: ''
        }
      },
      phone: '',
      website: '',
      company: {
        name: '',
        catchPhrase: '',
        bs: ''
      }
    });
  });
});
