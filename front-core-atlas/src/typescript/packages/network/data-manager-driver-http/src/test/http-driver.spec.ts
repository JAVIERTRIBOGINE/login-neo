/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';
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
  getHasTokens: hasTokensMock,
  setup: setupMock,
  http: httpMock,
  done: doneMock,
  getHeaders: getHeadersMock
};

const mockGenericDriverConstructor = jest.fn();
jest.unstable_mockModule('@proteo/data-manager-driver', () => ({
  GenericDriver: class {
    constructor() {
      mockGenericDriverConstructor();
    }
    http = jest.fn();
  }
}));

const mockHttpNativeDriver = jest.fn().mockImplementation(() => mockDriver);
jest.unstable_mockModule('../http-native-driver', () => ({ HttpNativeDriver: mockHttpNativeDriver }));

const mockHttpWebDriver = jest.fn().mockImplementation(() => mockDriver);
jest.unstable_mockModule('../http-web-driver', () => ({ HttpWebDriver: mockHttpWebDriver }));

const mockNative = jest.fn();
jest.unstable_mockModule('@proteo/platform-utils', () => ({ isNative: mockNative }));

describe('http-driver', () => {
  let HttpDriver: any;

  beforeEach(async () => {
    ({ HttpDriver } = await import('../http-driver.js'));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should delegate constructor to parent GenericDriver class', () => {
    expect.assertions(2);
    expect(new HttpDriver(config)).toBeInstanceOf(HttpDriver);
    expect(mockGenericDriverConstructor).toHaveBeenCalledTimes(1);
  });

  it('should create a native driver instance on mobile devices', async () => {
    expect.assertions(3);
    mockNative.mockReturnValueOnce(true);
    expect(new HttpDriver(config)).toBeInstanceOf(HttpDriver);
    expect(mockHttpNativeDriver).toHaveBeenCalledTimes(1);
    expect(mockHttpWebDriver).not.toHaveBeenCalled();
  });

  it('should create a http driver instance on browser', async () => {
    expect.assertions(3);
    mockNative.mockReturnValueOnce(false);
    expect(new HttpDriver(config)).toBeInstanceOf(HttpDriver);
    expect(mockHttpWebDriver).toHaveBeenCalledTimes(1);
    expect(mockHttpNativeDriver).not.toHaveBeenCalled();
  });
});
