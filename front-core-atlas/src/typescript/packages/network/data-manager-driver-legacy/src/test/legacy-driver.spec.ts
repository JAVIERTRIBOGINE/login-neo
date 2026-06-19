/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, jest, afterEach } from '@jest/globals';
import type { DriverConfiguration } from '@proteo/types';

const config: DriverConfiguration = {
  host: 'http://host.test',
  baseUrl: 'mock/test',
  name: 'test'
};

const setAuthorizationMock = jest.fn();
const clearTokensMock = jest.fn();
const hasTokensMock = jest.fn();
const setupMock = jest.fn();
const httpMock = jest.fn();
const doneMock = jest.fn();
const getHeadersMock = jest.fn();
const mockDriver = {
  setAuthorization: setAuthorizationMock,
  clearTokens: clearTokensMock,
  setup: setupMock,
  http: httpMock,
  done: doneMock,
  getHeaders: getHeadersMock
};
Object.defineProperty(mockDriver, 'getHasTokens', {
  get: hasTokensMock
});
const mockLegacyNativeDriver = jest.fn().mockImplementation(() => mockDriver);
jest.unstable_mockModule('../legacy-native-driver', () => ({ LegacyNativeDriver: mockLegacyNativeDriver }));

const mockLegacyWebDriver = jest.fn().mockImplementation(() => mockDriver);
jest.unstable_mockModule('../legacy-web-driver', () => ({ LegacyWebDriver: mockLegacyWebDriver }));

const mockNative = jest.fn();
jest.unstable_mockModule('@proteo/platform-utils', () => ({ isNative: mockNative }));

describe('legacy-driver', () => {
  let LegacyDriver: any;

  beforeEach(async () => {
    ({ LegacyDriver } = await import('../legacy-driver'));
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create a native driver instance on mobile devices', async () => {
      expect.assertions(3);
      mockNative.mockReturnValueOnce(true);
      expect(new LegacyDriver(config)).toBeInstanceOf(LegacyDriver);
      expect(mockLegacyNativeDriver).toHaveBeenCalledTimes(1);
      expect(mockLegacyWebDriver).not.toHaveBeenCalled();
    });

    it('should create a http driver instance on browser', async () => {
      expect.assertions(3);
      mockNative.mockReturnValueOnce(false);
      expect(new LegacyDriver(config)).toBeInstanceOf(LegacyDriver);
      expect(mockLegacyWebDriver).toHaveBeenCalledTimes(1);
      expect(mockLegacyNativeDriver).not.toHaveBeenCalled();
    });
  });

  describe('methods', () => {
    let driver: typeof LegacyDriver;
    beforeEach(() => {
      driver = new LegacyDriver(config);
    });

    describe('setAuthorization', () => {
      it('should delegate setAuthorization call to instance class', () => {
        expect.assertions(1);
        const authorizationTokens = {
          OIDC: 'OICD',
          OAUTH: 'OAUTH'
        };
        driver.setAuthorization(authorizationTokens);
        expect(setAuthorizationMock).toHaveBeenCalledWith(authorizationTokens);
      });
    });

    describe('clearTokens', () => {
      it('should delegate clearTokens call to instance class', () => {
        expect.assertions(1);
        driver.clearTokens();
        expect(clearTokensMock).toHaveBeenCalled();
      });
    });

    describe('hasTokens', () => {
      it('should delegate hasTokens call to instance class', () => {
        expect.assertions(1);
        driver.hasTokens();
        expect(hasTokensMock).toHaveBeenCalled();
      });
    });

    describe('getHeaders', () => {
      it('should delegate getHeaders call to instance class', () => {
        expect.assertions(1);
        const driver = new LegacyDriver(config);
        const headers = {};
        const method = 'GET';
        driver.getHeaders(headers, method);
        expect(getHeadersMock).toHaveBeenCalledWith(headers, method);
      });
    });
  });
});
