/**
 * scripts/__tests__/snapshot-publish.test.mjs
 *
 * Tests unitarios con node:test (Node.js 18+).
 * Ejecutar: node --test scripts/__tests__/snapshot-publish.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import {
  parseArgs,
  generateSnapshotVersion,
  parseWorkspaceYaml,
  globToRegex,
  createSnapshotPublishPlan
} from '../snapshot-publish.mjs';

// ── parseArgs ─────────────────────────────────────────────────────────────────

describe('parseArgs', () => {
  it('devuelve defaults sin argumentos', () => {
    const result = parseArgs(['node', 'script.mjs']);
    assert.equal(result.dryRun, false);
    assert.equal(result.watchMode, false);
    assert.equal(result.registry, 'http://localhost:4873');
    assert.deepEqual(result.packages, []);
  });

  it('detecta --dry-run', () => {
    const result = parseArgs(['node', 'script.mjs', '--dry-run']);
    assert.equal(result.dryRun, true);
  });

  it('detecta --watch', () => {
    const result = parseArgs(['node', 'script.mjs', '--watch']);
    assert.equal(result.watchMode, true);
  });

  it('detecta --registry con espacio', () => {
    const result = parseArgs(['node', 'script.mjs', '--registry', 'http://custom:5000']);
    assert.equal(result.registry, 'http://custom:5000');
  });

  it('detecta --registry=value', () => {
    const result = parseArgs(['node', 'script.mjs', '--registry=http://custom:5000']);
    assert.equal(result.registry, 'http://custom:5000');
  });

  it('recoge paquetes explícitos como argumentos positivos', () => {
    const result = parseArgs(['node', 'script.mjs', '@myorg/ui', '@myorg/utils']);
    assert.deepEqual(result.packages, ['@myorg/ui', '@myorg/utils']);
  });

  it('combina flags y paquetes', () => {
    const result = parseArgs(['node', 'script.mjs', '--dry-run', '@myorg/ui', '--registry', 'http://x:9000']);
    assert.equal(result.dryRun, true);
    assert.equal(result.registry, 'http://x:9000');
    assert.deepEqual(result.packages, ['@myorg/ui']);
  });

  it('ignora flags desconocidos sin explotar', () => {
    assert.doesNotThrow(() => parseArgs(['node', 'script.mjs', '--unknown-flag']));
  });
});

// ── generateSnapshotVersion ───────────────────────────────────────────────────

describe('generateSnapshotVersion', () => {
  it('genera versión snapshot correcta', () => {
    assert.equal(generateSnapshotVersion('1.2.3', 1710849600000), '1.2.3-dev.1710849600000');
  });

  it('elimina pre-release existente antes de añadir snapshot', () => {
    assert.equal(generateSnapshotVersion('2.0.0-beta.1', 1710849600000), '2.0.0-dev.1710849600000');
  });

  it('elimina build metadata existente', () => {
    assert.equal(generateSnapshotVersion('1.0.0+build.42', 1710849600000), '1.0.0-dev.1710849600000');
  });

  it('funciona con versión 0.x.x', () => {
    assert.equal(generateSnapshotVersion('0.1.0', 1000), '0.1.0-dev.1000');
  });

  it('usa el timestamp proporcionado', () => {
    const ts = Date.now();
    const result = generateSnapshotVersion('3.0.0', ts);
    assert.ok(result.endsWith(`-dev.${ts}`));
  });
});

// ── parseWorkspaceYaml ────────────────────────────────────────────────────────

describe('parseWorkspaceYaml', () => {
  it('parsea formato estándar de pnpm-workspace.yaml', () => {
    const yaml = `
packages:
  - 'src/config/*'
  - 'src/typescript/bootstrap'
  - "src/angular/*"
`;
    const result = parseWorkspaceYaml(yaml);
    assert.deepEqual(result.packages, ['src/config/*', 'src/typescript/bootstrap', 'src/angular/*']);
  });

  it('ignora líneas de comentario', () => {
    const yaml = `
packages:
  # esto es un comentario
  - 'src/utils/*'
  - 'src/angular/*'
`;
    const result = parseWorkspaceYaml(yaml);
    assert.deepEqual(result.packages, ['src/utils/*', 'src/angular/*']);
  });

  it('maneja comillas simples y dobles', () => {
    const yaml = `packages:\n  - 'single'\n  - "double"\n  - bare\n`;
    const result = parseWorkspaceYaml(yaml);
    assert.deepEqual(result.packages, ['single', 'double', 'bare']);
  });

  it('devuelve array vacío si no hay paquetes', () => {
    const result = parseWorkspaceYaml('other:\n  - value\n');
    assert.deepEqual(result.packages, []);
  });

  it('para al encontrar una nueva clave de nivel superior', () => {
    const yaml = `packages:\n  - 'src/*'\ncatalog:\n  foo: bar\n`;
    const result = parseWorkspaceYaml(yaml);
    assert.deepEqual(result.packages, ['src/*']);
  });
});

// ── globToRegex / miniglob ────────────────────────────────────────────────────

describe('globToRegex (miniglob)', () => {
  it('* coincide con un segmento sin barra', () => {
    const re = globToRegex('packages/*');
    assert.ok(re.test('packages/ui'));
    assert.ok(re.test('packages/utils'));
  });

  it('* NO coincide con rutas que cruzan /', () => {
    const re = globToRegex('packages/*');
    assert.ok(!re.test('packages/ui/src/index.ts'));
    assert.ok(!re.test('packages/ui/nested'));
  });

  it('** coincide con rutas anidadas', () => {
    const re = globToRegex('src/**/index.ts');
    assert.ok(re.test('src/utils/index.ts'));
    assert.ok(re.test('src/deep/nested/index.ts'));
  });

  it('ruta literal sin glob coincide exacta', () => {
    const re = globToRegex('src/typescript/bootstrap');
    assert.ok(re.test('src/typescript/bootstrap'));
    assert.ok(!re.test('src/typescript/bootstrapExtra'));
    assert.ok(!re.test('src/typescript'));
  });

  it('escapa caracteres especiales de regex en la ruta', () => {
    const re = globToRegex('src/typescript/utils/*');
    assert.ok(re.test('src/typescript/utils/logger-utils'));
    assert.ok(!re.test('src/typescriptXutils/logger-utils'));
  });

  it('no coincide con cadena vacía', () => {
    const re = globToRegex('packages/*');
    assert.ok(!re.test(''));
    assert.ok(!re.test('packages/'));
  });
});

// ── createSnapshotPublishPlan ────────────────────────────────────────────────

describe('createSnapshotPublishPlan', () => {
  const manifestPath = fileURLToPath(import.meta.url);

  const pkg = (name, deps = {}, scripts = {}) => ({
    dir: process.cwd(),
    pkgJsonPath: manifestPath,
    pkgJson: {
      name,
      version: '1.0.0',
      scripts,
      ...(Object.keys(deps).length > 0 ? { dependencies: deps } : {})
    }
  });

  it('publica semillas, dependientes y dependencias internas del lote, pero solo buildea semillas tocadas', () => {
    const core = pkg('@test/core', {}, { build: 'build-core' });
    const feature = pkg('@test/feature', { '@test/core': 'workspace:*' }, { build: 'build-feature' });
    const theme = pkg('@test/theme', {}, { build: 'build-theme' });
    const app = pkg(
      '@test/app',
      { '@test/feature': 'workspace:*', '@test/theme': 'workspace:*' },
      { build: 'build-app' }
    );
    const sibling = pkg('@test/sibling');

    const plan = createSnapshotPublishPlan([core], [core, feature, theme, app, sibling]);

    assert.deepEqual(
      plan.publishPackages.map((p) => p.pkgJson.name),
      ['@test/core', '@test/feature', '@test/theme', '@test/app']
    );
    assert.deepEqual(
      plan.buildPackages.map((p) => p.pkgJson.name),
      ['@test/core']
    );
  });
});
