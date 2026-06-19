#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const concurrency = Number(process.env.NPM_VIEW_CONCURRENCY ?? 6);
const npmViewTimeout = Number(process.env.NPM_VIEW_TIMEOUT_MS ?? 30000);
const includePrivate = process.argv.includes('--include-private');

const ignoredDirs = new Set(['.angular', '.git', 'coverage', 'dist', 'node_modules']);

function findPackageJsonFiles(dir) {
  const files = [];

  for (const entry of readdirSync(dir)) {
    if (ignoredDirs.has(entry)) continue;

    const absolutePath = join(dir, entry);
    const stat = statSync(absolutePath);

    if (stat.isDirectory()) {
      files.push(...findPackageJsonFiles(absolutePath));
      continue;
    }

    if (entry === 'package.json') {
      files.push(absolutePath);
    }
  }

  return files;
}

function parseVersion(version) {
  const match = String(version)
    .trim()
    .match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!match) return null;

  return match.slice(1, 4).map(Number);
}

function compareVersions(a, b) {
  const parsedA = parseVersion(a);
  const parsedB = parseVersion(b);

  if (!parsedA || !parsedB) {
    throw new Error(`No se pueden comparar versiones: ${a} / ${b}`);
  }

  for (let i = 0; i < parsedA.length; i += 1) {
    if (parsedA[i] !== parsedB[i]) return parsedA[i] - parsedB[i];
  }

  return 0;
}

function npmViewVersion(packageName) {
  return new Promise((resolve) => {
    const child = spawn('npm', ['view', packageName, 'version', '--json'], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({
        ok: false,
        error: `timeout tras ${npmViewTimeout}ms`
      });
    }, npmViewTimeout);

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('close', (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        resolve({
          ok: false,
          error: stderr.trim().split('\n').at(-1) || `npm view fallo con codigo ${code}`
        });
        return;
      }

      const rawValue = stdout.trim();

      try {
        resolve({
          ok: true,
          version: JSON.parse(rawValue)
        });
      } catch {
        resolve({
          ok: true,
          version: rawValue.replace(/^"|"$/g, '')
        });
      }
    });
  });
}

async function runWithConcurrency(items, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runNext() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runNext));

  return results;
}

const packages = findPackageJsonFiles(root)
  .map((file) => {
    const packageJson = JSON.parse(readFileSync(file, 'utf8'));

    return {
      file: relative(root, file),
      name: packageJson.name,
      version: packageJson.version,
      private: Boolean(packageJson.private)
    };
  })
  .filter((packageJson) => packageJson.name && packageJson.version)
  .filter((packageJson) => includePrivate || !packageJson.private)
  .sort((a, b) => a.file.localeCompare(b.file));

console.error(`Consultando ${packages.length} paquetes con npm view...`);

const results = await runWithConcurrency(packages, async (packageJson, index) => {
  console.error(`[${index + 1}/${packages.length}] npm view ${packageJson.name} version`);

  const published = await npmViewVersion(packageJson.name);

  if (!published.ok) {
    return {
      status: 'unavailable',
      ...packageJson,
      error: published.error
    };
  }

  return {
    status: compareVersions(published.version, packageJson.version) > 0 ? 'higher' : 'ok',
    ...packageJson,
    publishedVersion: published.version
  };
});

const higher = results.filter((result) => result.status === 'higher');
const unavailable = results.filter((result) => result.status === 'unavailable');

if (higher.length > 0) {
  console.log('Paquetes con version publicada mayor que la version local:');

  for (const result of higher) {
    console.log(`- ${result.name}: local ${result.version}, publicada ${result.publishedVersion} (${result.file})`);
  }
} else {
  console.log('No hay paquetes con version publicada mayor que la version local.');
}

if (unavailable.length > 0) {
  console.log('');
  console.log('Paquetes que no se pudieron consultar con npm view:');

  for (const result of unavailable) {
    console.log(`- ${result.name}: local ${result.version} (${result.file}) - ${result.error}`);
  }
}

if (higher.length > 0) {
  process.exitCode = 1;
} else if (unavailable.length > 0) {
  process.exitCode = 2;
}
