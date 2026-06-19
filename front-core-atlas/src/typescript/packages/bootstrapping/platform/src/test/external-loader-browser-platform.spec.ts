import { beforeEach, afterEach, describe, expect, it, xit, jest } from '@jest/globals';
import type { FetchMock } from 'jest-fetch-mock';
import fetch from 'jest-fetch-mock';
import { MOCK_CONFIG } from './mock/config';

const fetchMock = fetch as unknown as FetchMock;
let mockConfig = MOCK_CONFIG;
fetchMock.enableMocks();

jest.unstable_mockModule('@proteo/config-loader', () => ({
  ConfigLoader: {
    retrieveAllGlobalConfig: jest.fn().mockResolvedValue(mockConfig as never)
  }
}));

jest.unstable_mockModule('@proteo/data-manager', () => ({
  initialize: jest.fn(),
  getDriver: jest.fn().mockReturnValue({
    setAuthorization: jest.fn(),
    clearTokens: jest.fn()
  })
}));

describe('External Loader Browser Platform', () => {
  let appInstance: any;
  beforeEach(async () => {
    const { ExternalLoaderBrowserPlatform } = await import('../external-loader-browser-platform');
    appInstance = new ExternalLoaderBrowserPlatform();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('bootstrap should work without configuration', async () => {
    const config = await appInstance.bootstrap();
    expect(config).not.toBeUndefined();
  });

  xit('bootstrap should return the configuration', async () => {
    const { initialize: initializeDataManager } = await import('@proteo/data-manager');
    const dataManagerConfig = {
      HOST: 'http://localhost',
      BASE_PATH: '/',
      DRIVER: 'HTTP' as const
    };
    mockConfig = {
      DATAMANAGER_CONFIG: { DRIVER: dataManagerConfig }
    } as any;
    const config = await appInstance.bootstrap();
    expect(initializeDataManager).toBeCalledWith(dataManagerConfig);
    expect(config.DATAMANAGER_CONFIG.HOST).toEqual('http://localhost');
    expect(config.DATAMANAGER_CONFIG.BASE_PATH).toEqual('/');
  });
});
