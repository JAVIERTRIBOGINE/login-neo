module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['import', '@typescript-eslint', 'boundaries', '@proteo/commitment'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/eslint-recommended', 'plugin:prettier/recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  env: {
    browser: true,
    node: true,
    jest: true
  },
  ignorePatterns: ['**/*.d.ts', '**/*.spec.ts'],

  rules: {
    '@proteo/commitment/no-httpclient': 'error',
    '@proteo/commitment/no-axios': 'error',
    '@proteo/commitment/no-fetch': 'error',
    '@proteo/commitment/no-got': 'error',
    '@proteo/commitment/no-superagent': 'error',
    '@proteo/commitment/no-xmlhttprequest': 'error',
    '@proteo/commitment/no-windowbs': 'error',
    '@proteo/commitment/no-rox': 'error',

    'boundaries/element-types': [
      'error',
      {
        default: 'disallow',
        rules: [
          { from: 'domain', allow: ['base', 'domain'] },
          { from: 'application', allow: ['base', 'domain', 'application'] },
          {
            from: 'infrastructure',
            allow: ['base', 'domain', 'application', 'infrastructure', 'data-manager']
          },
          { from: 'presentation', allow: ['base', 'application', 'presentation'] }
        ]
      }
    ],
    'boundaries/no-unknown': 'error',

    'no-unused-vars': 'off',
    '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': 'allow-with-description' }],
    '@typescript-eslint/no-this-alias': [
      'error',
      {
        allowDestructuring: true,
        allowedNames: ['instance']
      }
    ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }
    ],
    '@typescript-eslint/no-unused-expressions': [
      'error',
      {
        allowShortCircuit: true,
        allowTernary: true
      }
    ],
    '@typescript-eslint/no-unsafe-function-type': 'warn',
    '@typescript-eslint/no-wrapper-object-types': 'error',
    'prettier/prettier': ['error', { endOfLine: 'auto' }]
  },

  settings: {
    'import/resolver': {
      node: { extensions: ['.ts', '.js'] },
      typescript: { alwaysTryTypes: true }
    },
    'boundaries/elements': [
      { type: 'base', pattern: 'src/app/base/**' },
      { type: 'domain', pattern: 'src/app/domain/**' },
      { type: 'application', pattern: 'src/app/application/**' },
      { type: 'infrastructure', pattern: 'src/app/infrastructure/**' },
      { type: 'presentation', pattern: 'src/app/presentation/**' },
      { type: 'domain', pattern: 'src/app/*/domain/**' },
      { type: 'application', pattern: 'src/app/*/application/**' },
      { type: 'infrastructure', pattern: 'src/app/*/infrastructure/**' },
      { type: 'presentation', pattern: 'src/app/*/presentation/**' },
      { type: 'data-manager', pattern: '@proteo/data-manager' }
    ]
  },

  overrides: [
    {
      files: ['**/models/**/*.ts'],
      excludedFiles: ['**/application/**'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: 'Program',
            message: 'No model files allowed outside of application layer.'
          }
        ]
      }
    },
    {
      files: ['**/models/**/*.ts'],
      excludedFiles: ['**/*.model.ts'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: 'Program',
            message: "Only '*.model.ts' files are allowed inside 'models' folders."
          }
        ]
      }
    },
    {
      files: ['**/*.model.ts'],
      excludedFiles: ['**/models/**/*.model.ts'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: 'Program',
            message: "'*.model.ts' files are only allowed inside 'models' folders."
          }
        ]
      }
    },
    {
      files: ['**/*.json'],
      processor: '@proteo/commitment/.json'
    }
  ]
};
