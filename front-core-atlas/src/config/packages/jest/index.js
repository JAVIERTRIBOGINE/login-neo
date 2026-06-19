// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

import { fileURLToPath } from 'url';
import { dirname, sep, join } from 'path';

/** @type {import('ts-jest').JestConfigWithTsJest} */
export const config = {
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true
      }
    ]
  },
  moduleNameMapper: {
    '(.+)\\.js': '$1'
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  extensionsToTreatAsEsm: ['.ts'],
  rootDir: '.',
  testRegex: '(?:src|test)/.*\\.(?:e2e-)?spec\\.ts$',
  testTimeout: 30000,
  restoreMocks: true,
  testEnvironment: 'jest-environment-jsdom',
  setupFiles: []
};

/**
 * Creates a jest config with coverage output directed to coverage/<type>/<package>/
 * in the project root, based on the calling package's location.
 *
 * @param {string} importMetaUrl - Pass `import.meta.url` from the calling jest.config.mjs
 * @returns {import('ts-jest').JestConfigWithTsJest}
 */
export const createConfig = (importMetaUrl) => {
  const configDir = dirname(fileURLToPath(importMetaUrl));
  const parts = configDir.split(sep);
  const srcIndex = parts.lastIndexOf('src');
  const rootDir = parts.slice(0, srcIndex).join(sep) || '/';
  const type = parts[srcIndex + 1];
  const packageName = parts[parts.length - 1];

  return {
    ...config,
    coverageDirectory: join(rootDir, 'coverage', type, packageName)
  };
};
