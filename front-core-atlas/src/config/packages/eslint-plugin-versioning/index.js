'use strict';

/**
 * Procesador pass-through: no transforma el código ni filtra mensajes.
 * Se usa para anular el procesador implícito de @proteo/commitment (.json)
 * en los archivos de versioning (package.json, package-lock.json).
 */
const passThroughProcessor = {
  preprocess: (code) => [code],
  postprocess: (messages) => messages.flat()
};

module.exports = {
  rules: {
    'no-dev-version': require('./no-dev-version'),
    'no-localhost-in-lock': require('./no-localhost-in-lock')
  },

  processors: {
    '.json': passThroughProcessor,
    '.yaml': passThroughProcessor
  },

  configs: {
    recommended: {
      plugins: ['@proteo/versioning'],
      overrides: [
        {
          files: ['**/package.json'],
          processor: '@proteo/versioning/.json',
          parser: '@proteo/eslint-plugin-versioning/parsers/plain-text',
          rules: {
            'prettier/prettier': 'off',
            '@proteo/versioning/no-dev-version': 'error'
          }
        },
        {
          files: ['**/package-lock.json'],
          processor: '@proteo/versioning/.json',
          parser: '@proteo/eslint-plugin-versioning/parsers/plain-text',
          rules: {
            'prettier/prettier': 'off',
            '@proteo/versioning/no-localhost-in-lock': 'error'
          }
        },
        {
          files: ['**/pnpm-lock.yaml'],
          processor: '@proteo/versioning/.yaml',
          parser: '@proteo/eslint-plugin-versioning/parsers/plain-text',
          rules: {
            'prettier/prettier': 'off',
            '@proteo/versioning/no-localhost-in-lock': 'error'
          }
        }
      ]
    }
  }
};
