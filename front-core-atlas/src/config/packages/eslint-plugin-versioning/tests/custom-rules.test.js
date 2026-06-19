'use strict';

const { RuleTester } = require('eslint');
const noDevVersion = require('../no-dev-version');
const noLocalhostInLock = require('../no-localhost-in-lock');

const parser = require.resolve('../parsers/plain-text');
const tester = new RuleTester({ parser });

// ─────────────────────────────────────────────
// Tests: no-dev-version (package.json)
// ─────────────────────────────────────────────
tester.run('no-dev-version', noDevVersion, {
  valid: [
    {
      filename: 'package.json',
      code: JSON.stringify({
        dependencies: {
          'my-lib': '1.0.0',
          'other-lib': '^2.3.1',
          'corp-ui': '~3.0.0-beta.1'
        }
      })
    },
    {
      filename: 'package.json',
      code: JSON.stringify({ name: 'my-app', version: '1.0.0' })
    },
    {
      // No es package.json — debe ignorarse
      filename: 'other.json',
      code: JSON.stringify({ dependencies: { 'my-lib': '1.0.0.dev.123456' } })
    }
  ],

  invalid: [
    {
      filename: 'package.json',
      code: JSON.stringify({ dependencies: { 'corp-button': '2.1.0.dev.1698765432123' } }),
      errors: [{ messageId: 'devVersionFound', data: { dep: 'corp-button', version: '2.1.0.dev.1698765432123' } }]
    },
    {
      filename: 'package.json',
      code: JSON.stringify({ devDependencies: { 'corp-utils': '0.9.1.dev.0' } }),
      errors: [{ messageId: 'devVersionFound', data: { dep: 'corp-utils', version: '0.9.1.dev.0' } }]
    },
    {
      filename: 'package.json',
      code: JSON.stringify({
        dependencies: { 'lib-a': '1.0.0', 'lib-b': '2.0.0.dev.1234567890' },
        peerDependencies: { 'lib-c': '3.0.0.dev.9999' }
      }),
      errors: [
        { messageId: 'devVersionFound', data: { dep: 'lib-b', version: '2.0.0.dev.1234567890' } },
        { messageId: 'devVersionFound', data: { dep: 'lib-c', version: '3.0.0.dev.9999' } }
      ]
    }
  ]
});

// ─────────────────────────────────────────────
// Tests: no-localhost-in-lock (package-lock.json)
// ─────────────────────────────────────────────
tester.run('no-localhost-in-lock (package-lock.json)', noLocalhostInLock, {
  valid: [
    {
      filename: 'package-lock.json',
      code: JSON.stringify({
        lockfileVersion: 2,
        packages: {
          'node_modules/corp-button': {
            version: '2.1.0',
            resolved: 'https://verdaccio.corp.example.com/corp-button/-/corp-button-2.1.0.tgz',
            integrity: 'sha512-abc123=='
          }
        }
      })
    },
    {
      filename: 'package-lock.json',
      code: JSON.stringify({
        lockfileVersion: 2,
        packages: { 'node_modules/corp-utils': { version: '1.0.0' } }
      })
    },
    {
      // No es package-lock.json — debe ignorarse
      filename: 'package.json',
      code: JSON.stringify({ resolved: 'http://localhost:4873/my-pkg/-/my-pkg-1.0.0.tgz' })
    }
  ],

  invalid: [
    {
      filename: 'package-lock.json',
      code: JSON.stringify({
        lockfileVersion: 2,
        packages: {
          'node_modules/corp-button': {
            version: '2.1.0',
            resolved: 'http://localhost:4873/corp-button/-/corp-button-2.1.0.tgz',
            integrity: 'sha512-abc123=='
          }
        }
      }),
      errors: [{ messageId: 'localhostUrlFound' }]
    },
    {
      filename: 'package-lock.json',
      code: JSON.stringify({
        lockfileVersion: 2,
        packages: {
          'node_modules/my-pkg': {
            version: '1.0.0',
            resolved: 'https://localhost/my-pkg/-/my-pkg-1.0.0.tgz'
          }
        }
      }),
      errors: [{ messageId: 'localhostUrlFound' }]
    },
    {
      filename: 'package-lock.json',
      code: JSON.stringify({
        lockfileVersion: 2,
        packages: {
          'node_modules/pkg-a': { version: '1.0.0', resolved: 'http://localhost:4873/pkg-a/-/pkg-a-1.0.0.tgz' },
          'node_modules/pkg-b': { version: '2.0.0', resolved: 'http://localhost:4873/pkg-b/-/pkg-b-2.0.0.tgz' }
        }
      }),
      errors: [{ messageId: 'localhostUrlFound' }, { messageId: 'localhostUrlFound' }]
    }
  ]
});

// ─────────────────────────────────────────────
// Tests: no-localhost-in-lock (pnpm-lock.yaml)
// ─────────────────────────────────────────────
tester.run('no-localhost-in-lock (pnpm-lock.yaml)', noLocalhostInLock, {
  valid: [
    {
      // Sin tarball: solo integrity, sin URL local
      filename: 'pnpm-lock.yaml',
      code: `packages:\n  foo@1.0.0:\n    resolution: {integrity: sha512-abc123}\n`
    },
    {
      // Tarball apuntando al registry oficial
      filename: 'pnpm-lock.yaml',
      code: `packages:\n  foo@1.0.0:\n    resolution: {integrity: sha512-abc123, tarball: 'https://registry.npmjs.org/foo/-/foo-1.0.0.tgz'}\n`
    },
    {
      // No es pnpm-lock.yaml — debe ignorarse
      filename: 'other.yaml',
      code: `packages:\n  foo@1.0.0:\n    resolution: {tarball: 'http://localhost:4873/foo-1.0.0.tgz'}\n`
    }
  ],

  invalid: [
    {
      filename: 'pnpm-lock.yaml',
      code: `packages:\n  foo@1.0.0:\n    resolution: {integrity: sha512-abc123, tarball: 'http://localhost:4873/foo/-/foo-1.0.0.tgz'}\n`,
      errors: [{ messageId: 'localhostUrlFoundInPnpmLock' }]
    },
    {
      // localhost sin puerto
      filename: 'pnpm-lock.yaml',
      code: `packages:\n  bar@2.0.0:\n    resolution: {tarball: 'https://localhost/bar/-/bar-2.0.0.tgz'}\n`,
      errors: [{ messageId: 'localhostUrlFoundInPnpmLock' }]
    }
  ]
});

console.log('All tests passed.');
