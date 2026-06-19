const fs = require('fs');

module.exports = {
  rules: {
    'no-httpclient': require('./rules/no-httpclient'),
    'no-axios': require('./rules/no-axios'),
    'no-fetch': require('./rules/no-fetch'),
    'no-got': require('./rules/no-got'),
    'no-superagent': require('./rules/no-superagent'),
    'no-xmlhttprequest': require('./rules/no-xmlhttprequest'),
    'no-windowbs': require('./rules/no-windowbs'),
    'no-rox': require('./rules/no-rox')
  },

  processors: {
    '.json': {
      preprocess(text, _filename) {
        return [text];
      },
      postprocess(_messages, filename) {
        if (!filename.endsWith('package.json')) return [];

        try {
          const content = fs.readFileSync(filename, 'utf8');
          const pkg = JSON.parse(content);

          if ((pkg.dependencies && pkg.dependencies.karma) || (pkg.devDependencies && pkg.devDependencies.karma)) {
            return [
              {
                ruleId: '@proteo/commitment/no-karma',
                message: "'karma' is present. It's recommended to migrate to Jest as described in the documentation.",
                severity: 1,
                line: 1,
                column: 1
              }
            ];
          }
        } catch {
          void 0;
        }
        return [];
      }
    }
  },

  configs: {
    recommended: {
      plugins: ['@proteo/commitment', 'boundaries'],
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
              { from: 'infrastructure', allow: ['base', 'domain', 'application', 'infrastructure', 'data-manager'] },
              { from: 'presentation', allow: ['base', 'application', 'presentation'] }
            ]
          }
        ],
        'boundaries/no-unknown': 'error'
      },
      settings: {
        'import/resolver': {
          node: { extensions: ['.ts', '.js'] }
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
        }
      ]
    }
  }
};
