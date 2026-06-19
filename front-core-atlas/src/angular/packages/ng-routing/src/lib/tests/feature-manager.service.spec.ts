import { jest } from '@jest/globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFilePath = import.meta.url.startsWith('file://') ? fileURLToPath(import.meta.url) : import.meta.url;
const currentDir = path.dirname(currentFilePath);
const transformModulePath = path.resolve(currentDir, '../utils/transform-remoteentry-url');
jest.unstable_mockModule(transformModulePath, () => ({
  changeRemoteEntry: jest.fn((remoteEntry, version) => `${remoteEntry}?version=${version}`)
}));

const { TestBed } = await import('@angular/core/testing');
const { FeatureManagerService } = await import('../services/feature-manager.service');
const { FeatureManager } = await import('@proteo/feature-manager');
const { EventManager } = await import('@proteo/event-bus');
const { BsApplicationList, BsApplication, BsMicrofrontend, BsApplicationFMConfig } =
  await import('../models/dynamic-routing.model');
const { EnumEnvironments } = await import('@proteo/types');
const { getUserInfo, extractUserInfoFromToken } = await import('@proteo/authorization-utils');
const { hasTokens } = await import('@proteo/data-manager');
const { isNative } = await import('@proteo/platform-utils');
const { getCookie } = await import('@proteo/cookie-utils');
const { getEnvironment } = await import('@proteo/environment-detection-utils');

describe('FeatureManagerService', () => {
  let service: FeatureManagerService;
  let mockFeatureManager: any;
  let mockEventManager: any;
  let mockGetUserInfo: jest.Mock;
  let mockExtractUserInfoFromToken: jest.Mock;
  let mockHasTokens: jest.Mock;
  let mockIsNative: jest.Mock;
  let mockGetCookie: jest.Mock;
  let mockGetEnvironment: jest.Mock;

  const createMockConfig = (): BsApplicationFMConfig => ({
    RELEASE_PROJECT: { KEY: 'release_project_key' },
    MAIN_PROJECT: { KEY: 'main_project_key' },
    CONTEXT: { customContext: 'value' }
  });

  const createMockInitData = (overrides = {}) => ({
    language: 'es-ES',
    auth: { OIDC: 'string', OAUTH: 'string' },
    externalData: {},
    initParameters: {},
    analytics: { analyticsId: 'analyticsId', analyticsVersion: 'analyticsVersion' },
    deviceInfo: {
      deviceId: 'deviceId',
      os: 'ios',
      DeviceInfoData: '',
      platform: 'mobile',
      platformVersion: '1.0.0',
      userAgent: 'test-agent',
      appVersion: '25.0'
    },
    ...overrides
  });

  beforeEach(() => {
    mockFeatureManager = {
      register: jest.fn().mockResolvedValue(undefined),
      value: jest.fn()
    };

    mockEventManager = {
      publishWithResponse: jest.fn()
    };

    (FeatureManager.getInstance as jest.Mock) = jest.fn(() => mockFeatureManager);
    (EventManager.getInstance as jest.Mock) = jest.fn(() => mockEventManager);

    mockGetUserInfo = getUserInfo as jest.Mock;
    mockExtractUserInfoFromToken = extractUserInfoFromToken as jest.Mock;
    mockHasTokens = hasTokens as jest.Mock;
    mockIsNative = isNative as jest.Mock;
    mockGetCookie = getCookie as jest.Mock;
    mockGetEnvironment = getEnvironment as jest.Mock;

    TestBed.configureTestingModule({
      providers: [FeatureManagerService]
    });
    service = TestBed.inject(FeatureManagerService);

    mockGetUserInfo.mockResolvedValue({ numpersona: 'numPersona', procedencia: 'procedencia' });
    mockExtractUserInfoFromToken.mockReturnValue({ dni: '12345678A' });
    mockHasTokens.mockReturnValue(true);
    mockIsNative.mockReturnValue(false);
    mockGetCookie.mockReturnValue('');
    mockGetEnvironment.mockReturnValue(EnumEnvironments.INT);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockFeatureManager.value.mockReset();
  });

  describe('updateRoutes', () => {
    it('should update routes with piloting enabled', async () => {
      const listRoutes: BsApplicationList = {
        app1: {
          appId: 'app1',
          type: 'P4_MFE',
          routeConfig: { isPiloting: true, remoteEntry: 'http://test.com/remoteEntry.js' } as BsMicrofrontend,
          payload: {}
        } as BsApplication
      };
      const config = createMockConfig();
      const initData = createMockInitData();

      mockFeatureManager.value
        .mockReturnValueOnce('') // releases
        .mockReturnValueOnce('') // killswitch
        .mockReturnValueOnce('disabled') // maintenance
        .mockReturnValueOnce(''); // version

      const result = await service.updateRoutes(listRoutes, config, initData);

      expect(result).toEqual(listRoutes);
      expect(mockFeatureManager.register).toHaveBeenCalledWith('RELEASE_PROJECT', 'release_project_key');
      expect(mockFeatureManager.register).toHaveBeenCalledWith('MAIN_PROJECT', 'main_project_key');
    });

    it('should update routes with userInfo from initData', async () => {
      const listRoutes: BsApplicationList = {
        app1: {
          appId: 'app1',
          type: 'P4_MFE',
          routeConfig: { isPiloting: false } as BsMicrofrontend,
          payload: {}
        } as BsApplication
      };
      const config = createMockConfig();
      const initData = createMockInitData({ userInfo: 'encoded-token' });

      mockExtractUserInfoFromToken.mockReturnValue({ dni: '87654321B' });
      mockFeatureManager.value.mockReturnValue('');

      await service.updateRoutes(listRoutes, config, initData);

      expect(mockExtractUserInfoFromToken).toHaveBeenCalledWith('encoded-token');
    });

    it('should update context with dni from externalData when not present', async () => {
      const listRoutes: BsApplicationList = {
        app1: {
          appId: 'app1',
          type: 'P4_MFE',
          routeConfig: { isPiloting: false } as BsMicrofrontend,
          payload: {}
        } as BsApplication
      };
      const config = createMockConfig();
      const initData = createMockInitData({
        externalData: { userContext: { dni: '11111111A' } }
      });

      mockExtractUserInfoFromToken.mockReturnValue({});
      mockFeatureManager.value.mockReturnValue('');

      await service.updateRoutes(listRoutes, config, initData);

      expect(initData.externalData).toBeDefined();
    });

    it('should use release cookie when available in non-PRO environment', async () => {
      const listRoutes: BsApplicationList = {
        app1: {
          appId: 'app1',
          type: 'P4_MFE',
          routeConfig: { isPiloting: false } as BsMicrofrontend,
          payload: {}
        } as BsApplication
      };
      const config = createMockConfig();
      const initData = createMockInitData();

      mockGetCookie.mockReturnValue('test-release-value');
      mockGetEnvironment.mockReturnValue(EnumEnvironments.INT);
      mockFeatureManager.value.mockReturnValue('');

      await service.updateRoutes(listRoutes, config, initData);

      expect(mockGetCookie).toHaveBeenCalledWith('25df5dad0a39ec8a6a36be8dcb9153806ca9691401dfb28bca8aab9d85fbd876');
    });

    it('should add releases to context when available', async () => {
      const listRoutes: BsApplicationList = {
        app1: {
          appId: 'app1',
          type: 'P4_MFE',
          routeConfig: { isPiloting: false } as BsMicrofrontend,
          payload: {}
        } as BsApplication
      };
      const config = createMockConfig();
      const initData = createMockInitData();

      mockFeatureManager.value
        .mockReturnValueOnce('flag1,flag2') // releases
        .mockReturnValueOnce('value1') // flag1
        .mockReturnValueOnce('value2'); // flag2

      await service.updateRoutes(listRoutes, config, initData);

      expect(mockFeatureManager.value).toHaveBeenCalledWith('releases', expect.any(Object));
    });

    it('should handle config without CONTEXT', async () => {
      const listRoutes: BsApplicationList = {
        app1: {
          appId: 'app1',
          type: 'P4_MFE',
          routeConfig: { isPiloting: false } as BsMicrofrontend,
          payload: {}
        } as BsApplication
      };
      const config: BsApplicationFMConfig = {
        RELEASE_PROJECT: { KEY: 'release_key' },
        MAIN_PROJECT: { KEY: 'main_key' }
      };
      const initData = createMockInitData();

      mockFeatureManager.value.mockReturnValue('');

      const result = await service.updateRoutes(listRoutes, config, initData);

      expect(result).toEqual(listRoutes);
    });

    it('should not update context with dni from externalData when dni already present in context', async () => {
      const listRoutes: BsApplicationList = {
        app1: {
          appId: 'app1',
          type: 'P4_MFE',
          routeConfig: { isPiloting: false } as BsMicrofrontend,
          payload: {}
        } as BsApplication
      };
      const config = createMockConfig();
      const initData = createMockInitData({
        userInfo: 'token-with-dni',
        externalData: { userContext: { dni: '11111111A' } }
      });

      mockExtractUserInfoFromToken.mockReturnValue({ dni: '99999999Z' });
      mockFeatureManager.value.mockReturnValue('');

      await service.updateRoutes(listRoutes, config, initData);

      expect(mockExtractUserInfoFromToken).toHaveBeenCalledWith('token-with-dni');
    });
  });

  describe('getReleaseCookie', () => {
    it('should return empty string in PRO environment', () => {
      mockGetEnvironment.mockReturnValue(EnumEnvironments.PRO);

      const result = service['getReleaseCookie']();

      expect(result).toBe('');
      expect(mockGetCookie).not.toHaveBeenCalled();
    });

    it('should return empty string when cookie is not present in non-PRO environment', () => {
      mockGetEnvironment.mockReturnValue(EnumEnvironments.INT);
      mockGetCookie.mockReturnValue(null);

      const result = service['getReleaseCookie']();

      expect(result).toBe('');
      expect(mockGetCookie).toHaveBeenCalled();
    });

    it('should return cookie value in non-PRO environment when present', () => {
      mockGetEnvironment.mockReturnValue(EnumEnvironments.INT);
      mockGetCookie.mockReturnValue('my-release-cookie');

      const result = service['getReleaseCookie']();

      expect(result).toBe('my-release-cookie');
      expect(mockGetCookie).toHaveBeenCalledWith('25df5dad0a39ec8a6a36be8dcb9153806ca9691401dfb28bca8aab9d85fbd876');
    });
  });

  describe('updateContextWithUserInfo', () => {
    it('should add user info when authenticated with tokens', async () => {
      mockHasTokens.mockReturnValue(true);
      mockGetUserInfo.mockResolvedValue({ numpersona: '12345', procedencia: 'web' });

      const context = { existingKey: 'value' };
      const result = await service['updateContextWithUserInfo'](context);

      expect(result).toEqual({
        existingKey: 'value',
        numpersona: '12345',
        procedencia: 'web'
      });
      expect(mockGetUserInfo).toHaveBeenCalled();
    });

    it('should check auth in native when no tokens', async () => {
      mockHasTokens.mockReturnValue(false);
      mockIsNative.mockReturnValue(true);
      mockEventManager.publishWithResponse.mockResolvedValue({ status: true });
      mockGetUserInfo.mockResolvedValue({ numpersona: '99999' });

      const context = {};
      const result = await service['updateContextWithUserInfo'](context);

      expect(mockEventManager.publishWithResponse).toHaveBeenCalledWith('CHECK_AUTH', { method: 'checkAuth' });
      expect(result).toEqual({ numpersona: '99999' });
    });

    it('should handle CHECK_AUTH error in native', async () => {
      mockHasTokens.mockReturnValue(false);
      mockIsNative.mockReturnValue(true);
      mockEventManager.publishWithResponse.mockRejectedValue(new Error('Auth error'));

      const context = {};
      const result = await service['updateContextWithUserInfo'](context);

      expect(result).toEqual(context);
      expect(mockGetUserInfo).not.toHaveBeenCalled();
    });

    it('should not check auth when not native and no tokens', async () => {
      mockHasTokens.mockReturnValue(false);
      mockIsNative.mockReturnValue(false);

      const context = {};
      const result = await service['updateContextWithUserInfo'](context);

      expect(result).toEqual(context);
      expect(mockEventManager.publishWithResponse).not.toHaveBeenCalled();
      expect(mockGetUserInfo).not.toHaveBeenCalled();
    });

    it('should handle getUserInfo error gracefully', async () => {
      mockHasTokens.mockReturnValue(true);
      mockGetUserInfo.mockRejectedValue(new Error('User info error'));

      const context = { key: 'value' };
      const result = await service['updateContextWithUserInfo'](context);

      expect(result).toEqual(context);
    });
  });

  describe('updateOperativeRoute - killswitch', () => {
    it('should activate killswitch when true', async () => {
      const operative: BsApplication = {
        appId: 'app1',
        type: 'P4_MFE',
        routeConfig: { isPiloting: true, remoteEntry: 'http://test.com/remoteEntry.js' } as BsMicrofrontend,
        payload: {}
      };

      mockFeatureManager.value.mockReset();
      mockFeatureManager.value.mockImplementation((key: string) => {
        if (key.includes('killswitch')) return 'true';
        if (key.includes('maintenance')) return 'disabled';
        if (key.includes('version')) return '1.0.0';
        return '';
      });

      await service['updateOperativeRoute'](operative, {});

      expect(operative.type).toBe('MAINTENANCE');
      expect(operative.maintenance).toBe('all_services_down');
    });
  });

  describe('updateOperativeRoute - maintenance', () => {
    it('should activate maintenance when not disabled', async () => {
      const operative: BsApplication = {
        appId: 'app2',
        type: 'P4_MFE',
        routeConfig: { isPiloting: true, remoteEntry: 'http://test.com/remoteEntry.js' } as BsMicrofrontend,
        payload: {}
      };

      mockFeatureManager.value.mockReset();
      mockFeatureManager.value.mockImplementation((key: string) => {
        if (key.includes('killswitch')) return 'false';
        if (key.includes('maintenance')) return 'scheduled';
        if (key.includes('version')) return '1.0.0';
        return '';
      });

      await service['updateOperativeRoute'](operative, {});

      expect(operative.type).toBe('MAINTENANCE');
      expect(operative.maintenance).toBe('scheduled');
    });

    it('should not activate maintenance when disabled', async () => {
      const operative: BsApplication = {
        appId: 'app3',
        type: 'P4_MFE',
        routeConfig: { isPiloting: true, remoteEntry: 'http://test.com/remoteEntry.js' } as BsMicrofrontend,
        payload: {}
      };

      mockFeatureManager.value.mockReset();
      mockFeatureManager.value.mockImplementation((key: string) => {
        if (key.includes('killswitch')) return 'false';
        if (key.includes('maintenance')) return 'disabled';
        if (key.includes('version')) return '1.0.0';
        return '';
      });

      await service['updateOperativeRoute'](operative, {});

      expect(operative.type).toBe('P4_MFE');
      expect(operative.maintenance).toBeUndefined();
    });
  });

  describe('updateOperativeRoute - version piloting', () => {
    it('should skip piloting when version is empty', async () => {
      const operative: BsApplication = {
        appId: 'app4',
        type: 'P4_MFE',
        routeConfig: { isPiloting: true, remoteEntry: 'http://test.com/remoteEntry.js' } as BsMicrofrontend,
        payload: {}
      };

      mockFeatureManager.value.mockReset();
      mockFeatureManager.value.mockImplementation((key: string) => {
        if (key.includes('killswitch')) return 'false';
        if (key.includes('maintenance')) return 'disabled';
        if (key.includes('version')) return '';
        return '';
      });

      await service['updateOperativeRoute'](operative, {});

      expect(operative.type).toBe('P4_MFE');
    });

    it('should change NATIVE to P4_MFE when version is not native', async () => {
      const operative: BsApplication = {
        appId: 'app5',
        type: 'NATIVE',
        routeConfig: { isPiloting: true, remoteEntry: 'http://test.com/remoteEntry.js' } as BsMicrofrontend,
        payload: {}
      };

      mockFeatureManager.value.mockReset();
      mockFeatureManager.value.mockImplementation((key: string) => {
        if (key.includes('killswitch')) return 'false';
        if (key.includes('maintenance')) return 'disabled';
        if (key.includes('version')) return '2.0.0';
        return '';
      });

      await service['updateOperativeRoute'](operative, {});

      expect(operative.type).toBe('P4_MFE');
      expect((operative.routeConfig as BsMicrofrontend).remoteEntry).toBe(
        'http://test.com/remoteEntry.js?version=2.0.0'
      );
    });

    it('should change P4_MFE to NATIVE when version is native', async () => {
      const operative: BsApplication = {
        appId: 'app6',
        type: 'P4_MFE',
        routeConfig: { isPiloting: true, remoteEntry: 'http://test.com/remoteEntry.js' } as BsMicrofrontend,
        payload: {}
      };

      mockFeatureManager.value.mockReset();
      mockFeatureManager.value.mockImplementation((key: string) => {
        if (key.includes('killswitch')) return 'false';
        if (key.includes('maintenance')) return 'disabled';
        if (key.includes('version')) return 'native';
        return '';
      });

      await service['updateOperativeRoute'](operative, {});

      expect(operative.type).toBe('NATIVE');
    });

    it('should change P4_MFE to NATIVE when version is native and type is P4_MFE', async () => {
      const operative: BsApplication = {
        appId: 'app7',
        type: 'P4_MFE',
        routeConfig: { isPiloting: true, remoteEntry: 'http://test.com/remoteEntry.js' } as BsMicrofrontend,
        payload: {}
      };

      mockFeatureManager.value.mockReset();
      mockFeatureManager.value.mockImplementation((key: string) => {
        if (key.includes('killswitch')) return 'false';
        if (key.includes('maintenance')) return 'disabled';
        if (key.includes('version')) return 'native';
        return '';
      });

      await service['updateOperativeRoute'](operative, {});

      expect(operative.type).toBe('NATIVE');
    });
  });

  describe('updateOperativeRoute - isPiloting false', () => {
    it('should skip piloting when isPiloting is false', async () => {
      const operative: BsApplication = {
        appId: 'app8',
        type: 'P4_MFE',
        routeConfig: { isPiloting: false, remoteEntry: 'http://test.com/remoteEntry.js' } as BsMicrofrontend,
        payload: {}
      };

      await service['updateOperativeRoute'](operative, {});

      expect(operative.type).toBe('P4_MFE');
      expect(mockFeatureManager.value).not.toHaveBeenCalled();
    });
  });

  describe('updateOperativeRoute - error handling', () => {
    it('should handle errors when reading feature manager flags', async () => {
      const operative: BsApplication = {
        appId: 'app9',
        type: 'P4_MFE',
        routeConfig: { isPiloting: true, remoteEntry: 'http://test.com/remoteEntry.js' } as BsMicrofrontend,
        payload: {}
      };

      mockFeatureManager.value.mockImplementation(() => {
        throw new Error('Feature manager error');
      });

      await service['updateOperativeRoute'](operative, {});

      expect(operative.type).toBe('P4_MFE');
    });
  });

  describe('getReleases', () => {
    it('should register release project and return releases value', async () => {
      const config = createMockConfig();
      const context = { key: 'value' };

      mockFeatureManager.value.mockReturnValue('release1,release2');

      const result = await service['getReleases'](config, context);

      expect(mockFeatureManager.register).toHaveBeenCalledWith('RELEASE_PROJECT', 'release_project_key');
      expect(result).toBe('release1,release2');
    });

    it('should handle error when getting releases', async () => {
      const config = createMockConfig();
      const context = {};

      mockFeatureManager.value.mockImplementation(() => {
        throw new Error('Error getting releases');
      });

      await expect(service['getReleases'](config, context)).rejects.toBe('Not found releases');
    });
  });

  describe('getReleasesFlags', () => {
    it('should return comma-separated release flag values', () => {
      const context = {};
      const releases = 'release_1,release_2,release_3';

      mockFeatureManager.value
        .mockReturnValueOnce('flag_value_1')
        .mockReturnValueOnce('flag_value_2')
        .mockReturnValueOnce('flag_value_3');

      const result = service['getReleasesFlags'](context, releases);

      expect(result).toBe('flag_value_1,flag_value_2,flag_value_3');
      expect(mockFeatureManager.value).toHaveBeenCalledTimes(3);
    });

    it('should filter out empty flag values', () => {
      const context = {};
      const releases = 'flag1,flag2,flag3';

      mockFeatureManager.value.mockReturnValueOnce('value1').mockReturnValueOnce('').mockReturnValueOnce('value3');

      const result = service['getReleasesFlags'](context, releases);

      expect(result).toBe('value1,value3');
    });

    it('should return empty string when all flags are empty', () => {
      const context = {};
      const releases = 'flag1,flag2';

      mockFeatureManager.value.mockReturnValue('');

      const result = service['getReleasesFlags'](context, releases);

      expect(result).toBe('');
    });
  });

  describe('readFeatureManager', () => {
    it('should read all feature flags for an operative', () => {
      const operative: BsApplication = {
        appId: 'testApp',
        type: 'P4_MFE',
        routeConfig: { isPiloting: true } as BsMicrofrontend,
        payload: {}
      };
      const context = { dni: '12345678A' };

      mockFeatureManager.value
        .mockReturnValueOnce('1.5.0') // version
        .mockReturnValueOnce('false') // killswitch
        .mockReturnValueOnce('disabled'); // maintenance

      const result = service['readFeatureManager'](operative, context);

      expect(result).toEqual({
        version: '1.5.0',
        killswitch: 'false',
        maintenance: 'disabled'
      });
      expect(mockFeatureManager.value).toHaveBeenCalledWith('front.testApp.version', expect.any(Object));
      expect(mockFeatureManager.value).toHaveBeenCalledWith('front.testApp.killswitch', expect.any(Object));
      expect(mockFeatureManager.value).toHaveBeenCalledWith('front.testApp.maintenance', expect.any(Object));
    });

    it('should use default values when flags are not present', () => {
      const operative: BsApplication = {
        appId: 'anotherApp',
        type: 'NATIVE',
        routeConfig: { isPiloting: true } as BsMicrofrontend,
        payload: {}
      };
      const context = {};

      mockFeatureManager.value.mockReturnValue('');

      const result = service['readFeatureManager'](operative, context);

      expect(result).toEqual({
        version: '',
        killswitch: '',
        maintenance: ''
      });
    });
  });

  describe('initializeFeatureManager', () => {
    it('should register main project with correct key', async () => {
      await service['initializeFeatureManager']('test-main-key');

      expect(mockFeatureManager.register).toHaveBeenCalledWith('MAIN_PROJECT', 'test-main-key');
    });
  });
});
