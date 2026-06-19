import { jest } from '@jest/globals';

globalThis.jest = jest;

jest.unstable_mockModule('@proteo/logger-utils', () => ({
  LoggerUtils: {
    getInstance: jest.fn().mockReturnValue({
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    })
  }
}));
jest.unstable_mockModule('@proteo/feature-manager', () => ({
  FeatureManager: { getInstance: jest.fn(), register: jest.fn(), value: jest.fn() }
}));
jest.unstable_mockModule('@proteo/event-bus', () => ({
  EventManager: { getInstance: jest.fn(), publishWithResponse: jest.fn() }
}));
jest.unstable_mockModule('@proteo/authorization-utils', () => ({
  getUserInfo: jest.fn(),
  extractUserInfoFromToken: jest.fn()
}));
jest.unstable_mockModule('@proteo/data-manager', () => ({
  hasTokens: jest.fn()
}));
jest.unstable_mockModule('@proteo/platform-utils', () => ({
  isNative: jest.fn(),
  isFullProteo: jest.fn()
}));
jest.unstable_mockModule('@proteo/cookie-utils', () => ({
  getCookie: jest.fn()
}));
jest.unstable_mockModule('@proteo/environment-detection-utils', () => ({
  getEnvironment: jest.fn()
}));

globalThis.ngJest = {
  testEnvironmentOptions: {
    errorOnUnknownElements: true,
    errorOnUnknownProperties: true
  }
};
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone/index.mjs';
setupZoneTestEnv();
