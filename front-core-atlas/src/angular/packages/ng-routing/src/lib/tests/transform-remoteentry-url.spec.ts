import {
  changeRemoteEntry,
  isValidVersionFormat,
  isSemanticVersion,
  detectUrlFormat,
  transformUrl,
  extractBasePath,
  buildSemanticUrl,
  buildMajorUrl
} from '../utils/transform-remoteentry-url';
import { LoggerUtils } from '@proteo/logger-utils';

describe('transform-remoteentry-url', () => {
  let mockLoggerInstance: Partial<LoggerUtils>;

  // Test constants
  const TEST_APP_ID = 'test-app';
  const BASE_URL = 'https://example.com/app';
  const COMPLEX_BASE_URL = 'https://cdn.example.com/microfrontends/my-app';
  const LOCALHOST_URL = 'https://localhost:8080';

  // URL constants
  const URLS = {
    semantic: {
      v1: `${BASE_URL}/v1/versions/1.0.0/remoteEntry.js`,
      v2: `${BASE_URL}/v2/versions/2.0.0/remoteEntry.js`,
      snapshot: `${BASE_URL}/v2/versions/2.0.0-SNAPSHOT/remoteEntry.js`
    },
    major: {
      v1: `${BASE_URL}/v1/remoteEntry.js`,
      v2: `${BASE_URL}/v2/remoteEntry.js`
    },
    invalid: {
      noVersion: `${BASE_URL}/remoteEntry.js`,
      wrongFile: `${BASE_URL}/v1/other.js`,
      unrecognized: `${BASE_URL}/invalid-format.js`
    }
  };

  // Version constants
  const VERSIONS = {
    semantic: {
      v1: '1.0.0',
      v2: '2.0.0',
      v10: '10.5.3',
      snapshot: '2.0.0-SNAPSHOT'
    },
    major: {
      v1: '1',
      v2: '2',
      v10: '10'
    },
    invalid: {
      incomplete: '1.0',
      withPrefix: 'v1.0.0',
      empty: '',
      malformed: 'invalid-version'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockLoggerInstance = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn()
    };

    (LoggerUtils.getInstance as jest.Mock).mockReturnValue(mockLoggerInstance);
  });

  describe('isValidVersionFormat', () => {
    it('should return true for valid semantic versions', () => {
      expect(isValidVersionFormat(VERSIONS.semantic.v1)).toBe(true);
      expect(isValidVersionFormat(VERSIONS.semantic.v2)).toBe(true);
      expect(isValidVersionFormat(VERSIONS.semantic.v10)).toBe(true);
      expect(isValidVersionFormat(VERSIONS.semantic.snapshot)).toBe(true);
    });

    it('should return true for valid major versions', () => {
      expect(isValidVersionFormat(VERSIONS.major.v1)).toBe(true);
      expect(isValidVersionFormat(VERSIONS.major.v2)).toBe(true);
      expect(isValidVersionFormat(VERSIONS.major.v10)).toBe(true);
    });

    it('should return false for invalid version formats', () => {
      expect(isValidVersionFormat(VERSIONS.invalid.incomplete)).toBe(false);
      expect(isValidVersionFormat('1.0.0.1')).toBe(false);
      expect(isValidVersionFormat(VERSIONS.invalid.withPrefix)).toBe(false);
      expect(isValidVersionFormat('1.0.0-RC')).toBe(false);
      expect(isValidVersionFormat(VERSIONS.invalid.empty)).toBe(false);
      expect(isValidVersionFormat('invalid')).toBe(false);
    });
  });

  describe('isSemanticVersion', () => {
    it('should return true for semantic versions', () => {
      expect(isSemanticVersion(VERSIONS.semantic.v1)).toBe(true);
      expect(isSemanticVersion(VERSIONS.semantic.v2)).toBe(true);
      expect(isSemanticVersion(VERSIONS.semantic.snapshot)).toBe(true);
    });

    it('should return false for non-semantic versions', () => {
      expect(isSemanticVersion(VERSIONS.major.v1)).toBe(false);
      expect(isSemanticVersion(VERSIONS.invalid.incomplete)).toBe(false);
      expect(isSemanticVersion('1.0.0.1')).toBe(false);
      expect(isSemanticVersion('invalid')).toBe(false);
    });
  });

  describe('detectUrlFormat', () => {
    it('should detect semantic URL format', () => {
      const semanticUrls = [URLS.semantic.v1, URLS.semantic.v2, URLS.semantic.snapshot];

      semanticUrls.forEach((url) => {
        expect(detectUrlFormat(url)).toBe('semantic');
      });
    });

    it('should detect major URL format', () => {
      const majorUrls = [URLS.major.v1, URLS.major.v2, `${BASE_URL}/v10/remoteEntry.js`];

      majorUrls.forEach((url) => {
        expect(detectUrlFormat(url)).toBe('major');
      });
    });

    it('should return null for unrecognized formats', () => {
      const invalidUrls = [
        URLS.invalid.noVersion,
        URLS.invalid.wrongFile,
        `${BASE_URL}/version/1.0.0/remoteEntry.js`,
        'invalid-url'
      ];

      invalidUrls.forEach((url) => {
        expect(detectUrlFormat(url)).toBeNull();
      });
    });
  });

  describe('extractBasePath', () => {
    it('should extract base path from semantic URLs', () => {
      const result = extractBasePath(URLS.semantic.v1, 'semantic');
      expect(result).toBe(BASE_URL);
    });

    it('should extract base path from major URLs', () => {
      const result = extractBasePath(URLS.major.v1, 'major');
      expect(result).toBe(BASE_URL);
    });

    it('should handle complex base paths', () => {
      const semanticUrl = `${COMPLEX_BASE_URL}/v2/versions/2.1.0/remoteEntry.js`;
      const majorUrl = `${COMPLEX_BASE_URL}/v2/remoteEntry.js`;

      expect(extractBasePath(semanticUrl, 'semantic')).toBe(COMPLEX_BASE_URL);
      expect(extractBasePath(majorUrl, 'major')).toBe(COMPLEX_BASE_URL);
    });
  });

  describe('buildSemanticUrl', () => {
    it('should build semantic URLs correctly', () => {
      expect(buildSemanticUrl(BASE_URL, VERSIONS.semantic.v1)).toBe(URLS.semantic.v1);
      expect(buildSemanticUrl(BASE_URL, '2.5.3')).toBe(`${BASE_URL}/v2/versions/2.5.3/remoteEntry.js`);
      expect(buildSemanticUrl(BASE_URL, VERSIONS.semantic.snapshot)).toBe(URLS.semantic.snapshot);
    });

    it('should extract major version correctly', () => {
      expect(buildSemanticUrl(BASE_URL, VERSIONS.semantic.v10)).toBe(
        `${BASE_URL}/v10/versions/${VERSIONS.semantic.v10}/remoteEntry.js`
      );
    });
  });

  describe('buildMajorUrl', () => {
    it('should build major URLs correctly', () => {
      expect(buildMajorUrl(BASE_URL, VERSIONS.major.v1)).toBe(URLS.major.v1);
      expect(buildMajorUrl(BASE_URL, VERSIONS.major.v2)).toBe(URLS.major.v2);
      expect(buildMajorUrl(BASE_URL, VERSIONS.major.v10)).toBe(`${BASE_URL}/v10/remoteEntry.js`);
    });
  });

  describe('transformUrl', () => {
    it('should transform to semantic URL when version is semantic', () => {
      const result = transformUrl(URLS.semantic.v1, VERSIONS.semantic.v2, 'semantic');
      expect(result).toBe(URLS.semantic.v2);
    });

    it('should transform to major URL when version is major', () => {
      const result = transformUrl(URLS.major.v1, VERSIONS.major.v2, 'major');
      expect(result).toBe(URLS.major.v2);
    });

    it('should transform from major to semantic URL format', () => {
      const result = transformUrl(URLS.major.v1, VERSIONS.semantic.v2, 'major');
      expect(result).toBe(URLS.semantic.v2);
    });

    it('should transform from semantic to major URL format', () => {
      const result = transformUrl(URLS.semantic.v1, VERSIONS.major.v2, 'semantic');
      expect(result).toBe(URLS.major.v2);
    });
  });

  describe('changeRemoteEntry', () => {
    it('should successfully transform semantic URL with semantic version', () => {
      const result = changeRemoteEntry(URLS.semantic.v1, VERSIONS.semantic.v2, TEST_APP_ID);
      expect(result).toBe(URLS.semantic.v2);
      expect(mockLoggerInstance.error).not.toHaveBeenCalled();
    });

    it('should successfully transform major URL with major version', () => {
      const result = changeRemoteEntry(URLS.major.v1, VERSIONS.major.v2, TEST_APP_ID);
      expect(result).toBe(URLS.major.v2);
      expect(mockLoggerInstance.error).not.toHaveBeenCalled();
    });

    it('should transform from major to semantic format', () => {
      const result = changeRemoteEntry(URLS.major.v1, VERSIONS.semantic.v2, TEST_APP_ID);
      expect(result).toBe(URLS.semantic.v2);
      expect(mockLoggerInstance.error).not.toHaveBeenCalled();
    });

    it('should transform from semantic to major format', () => {
      const result = changeRemoteEntry(URLS.semantic.v1, VERSIONS.major.v2, TEST_APP_ID);
      expect(result).toBe(URLS.major.v2);
      expect(mockLoggerInstance.error).not.toHaveBeenCalled();
    });

    it('should handle SNAPSHOT versions', () => {
      const result = changeRemoteEntry(URLS.semantic.v1, VERSIONS.semantic.snapshot, TEST_APP_ID);
      expect(result).toBe(URLS.semantic.snapshot);
      expect(mockLoggerInstance.error).not.toHaveBeenCalled();
    });

    it('should return original URL and log error for invalid version format', () => {
      const result = changeRemoteEntry(URLS.major.v1, VERSIONS.invalid.malformed, TEST_APP_ID);

      expect(result).toBe(URLS.major.v1);
      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        `❌ [DynamicRouting - Pilotaje] ${TEST_APP_ID} invalid version format: ${VERSIONS.invalid.malformed}`
      );
    });

    it('should return original URL and log error for unrecognized URL format', () => {
      const result = changeRemoteEntry(URLS.invalid.unrecognized, VERSIONS.semantic.v2, TEST_APP_ID);

      expect(result).toBe(URLS.invalid.unrecognized);
      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        `❌ [DynamicRouting - Pilotaje] ${TEST_APP_ID} URL format not recognized for piloting: ${URLS.invalid.unrecognized}`
      );
    });

    it('should handle errors gracefully and return original URL', () => {
      const originalError = mockLoggerInstance.error;

      (LoggerUtils.getInstance as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Logger initialization failed');
      });

      const result = changeRemoteEntry(URLS.major.v1, VERSIONS.invalid.malformed, TEST_APP_ID);

      expect(result).toBe(URLS.major.v1);

      (LoggerUtils.getInstance as jest.Mock).mockReturnValue(mockLoggerInstance);
      mockLoggerInstance.error = originalError;
    });

    it('should handle edge cases with different URL structures', () => {
      const testCases = [
        {
          url: `${COMPLEX_BASE_URL}/v1/versions/1.0.0/remoteEntry.js`,
          version: '3.2.1',
          expected: `${COMPLEX_BASE_URL}/v3/versions/3.2.1/remoteEntry.js`
        },
        {
          url: `${LOCALHOST_URL}/v2/remoteEntry.js`,
          version: '5',
          expected: `${LOCALHOST_URL}/v5/remoteEntry.js`
        }
      ];

      testCases.forEach(({ url, version, expected }) => {
        const result = changeRemoteEntry(url, version, TEST_APP_ID);
        expect(result).toBe(expected);
      });
    });
  });
});
