#!/usr/bin/env node
/**
 * scripts/snapshot-publish.mjs
 *
 * Publica dev snapshots de paquetes del monorepo a un registro Verdaccio local.
 *
 * Uso:
 *   node scripts/snapshot-publish.mjs                          # auto-detecta cambios via git
 *   node scripts/snapshot-publish.mjs @proteo/ui @proteo/utils # paquetes explícitos
 *   node scripts/snapshot-publish.mjs --dry-run                # sin publicar
 *   node scripts/snapshot-publish.mjs --registry http://...    # registry custom
 *   node scripts/snapshot-publish.mjs --watch                  # modo watch
 */

import { readFile, writeFile, cp, mkdtemp, rm } from 'node:fs/promises';
import { existsSync, realpathSync } from 'node:fs';
import { resolve, join, relative, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { watch } from 'node:fs';
import { tmpdir } from 'node:os';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '../..');

// ── ANSI ─────────────────────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

// ── Signal handling ───────────────────────────────────────────────────────────

/** @type {Set<string>} temp dirs to clean up on exit */
const tempDirs = new Set();

/** @type {Array<{ path: string, content: string }>} package.json files patched during snapshot publish */
const packageJsonRestores = [];
const packageJsonRestorePaths = new Set();

async function cleanupTempDirs() {
  const dirs = [...tempDirs];
  tempDirs.clear();
  await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true }).catch(() => {})));
}

async function restorePatchedPackageJsons() {
  const restores = packageJsonRestores.splice(0);
  packageJsonRestorePaths.clear();
  await Promise.all(
    restores.map(({ path, content }) =>
      writeFile(path, content, 'utf8').catch((e) => {
        process.stderr.write(`${C.red}[warn] No se pudo restaurar ${path}: ${e.message}${C.reset}\n`);
      })
    )
  );
}

async function rememberPackageJson(path) {
  if (!existsSync(path) || packageJsonRestorePaths.has(path)) return;
  packageJsonRestores.push({ path, content: await readFile(path, 'utf8') });
  packageJsonRestorePaths.add(path);
}

async function handleSignal(signal) {
  process.stderr.write(`\n${C.yellow}[${signal}] Limpiando directorios temporales...${C.reset}\n`);
  await restorePatchedPackageJsons();
  await cleanupTempDirs();
  process.exit(130);
}

process.on('SIGINT', () => handleSignal('SIGINT'));
process.on('SIGTERM', () => handleSignal('SIGTERM'));

// ── Args ──────────────────────────────────────────────────────────────────────

/**
 * @param {string[]} argv
 * @returns {{ dryRun: boolean, registry: string, watchMode: boolean, sync: boolean, packages: string[] }}
 */
export function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    dryRun: false,
    watchMode: false,
    sync: false,
    registry: 'http://localhost:4873',
    packages: []
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (arg === '--watch') {
      result.watchMode = true;
    } else if (arg === '--sync') {
      result.sync = true;
    } else if (arg === '--registry') {
      result.registry = args[++i];
    } else if (arg.startsWith('--registry=')) {
      result.registry = arg.slice('--registry='.length);
    } else if (!arg.startsWith('--')) {
      result.packages.push(arg);
    }
  }

  return result;
}

// ── YAML parser ───────────────────────────────────────────────────────────────

/**
 * Parsea pnpm-workspace.yaml (formato: packages: [- 'glob', ...])
 * @param {string} content
 * @returns {{ packages: string[] }}
 */
export function parseWorkspaceYaml(content) {
  const packages = [];
  let inPackages = false;

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;

    if (line === 'packages:') {
      inPackages = true;
      continue;
    }

    if (inPackages) {
      if (line.startsWith('-')) {
        const value = line
          .slice(1)
          .trim()
          .replace(/^['"]|['"]$/g, '');
        if (value) packages.push(value);
      } else {
        // New top-level key — exit packages section
        inPackages = false;
      }
    }
  }

  return { packages };
}

/**
 * Convierte globs simples (* y **) a RegExp.
 * @param {string} glob
 * @returns {RegExp}
 */
export function globToRegex(glob) {
  let pattern = '^';

  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    const next = glob[i + 1];

    if (ch === '*' && next === '*') {
      pattern += '.*';
      i++;
    } else if (ch === '*') {
      pattern += '[^/]+';
    } else {
      pattern += ch.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
    }
  }

  return new RegExp(`${pattern}$`);
}

/**
 * Lee y parsea pnpm-workspace.yaml desde rootDir
 * @param {string} rootDir
 * @returns {Promise<{ packages: string[] }>}
 */
export async function readWorkspaceConfig(rootDir) {
  const yamlPath = join(rootDir, 'pnpm-workspace.yaml');
  if (!existsSync(yamlPath)) {
    throw new Error('No se encontró pnpm-workspace.yaml. ¿Estás en la raíz del monorepo?');
  }
  const content = await readFile(yamlPath, 'utf8');
  return parseWorkspaceYaml(content);
}

// ── Workspace resolution via pnpm ─────────────────────────────────────────────

/**
 * Resuelve todos los paquetes del workspace usando `pnpm recursive list --json`.
 * Reemplaza el globbing manual que no soportaba correctamente patrones ** (anidados).
 * @param {string} rootDir
 * @param {string[]} _globs  (ignorado — se delega en pnpm)
 * @returns {Promise<Array<{ dir: string, pkgJson: object, pkgJsonPath: string }>>}
 */
export async function resolveWorkspacePackages(rootDir, _globs) {
  const { stdout } = await execFileAsync('pnpm', ['recursive', 'list', '--depth', '-1', '--json'], {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024
  });

  const entries = JSON.parse(stdout);
  const seen = new Set();
  const packages = [];

  for (const entry of entries) {
    const dir = realpathSync(resolve(rootDir, entry.path));
    if (seen.has(dir)) continue;
    seen.add(dir);

    const pkgJsonPath = join(dir, 'package.json');
    if (!existsSync(pkgJsonPath)) continue;

    const pkgJson = JSON.parse(await readFile(pkgJsonPath, 'utf8'));

    if (!pkgJson.name) {
      console.warn(`${C.yellow}[warn] ${pkgJsonPath} sin "name" — ignorando.${C.reset}`);
      continue;
    }
    // Si ya tenemos un paquete con este nombre (e.g. source + dist duplicado), nos quedamos con el primero
    if (packages.some((p) => p.pkgJson.name === pkgJson.name)) {
      console.warn(`${C.dim}[skip] ${pkgJson.name} ya registrado (${relative(rootDir, dir)}).${C.reset}`);
      continue;
    }

    packages.push({ dir, pkgJson, pkgJsonPath });
  }

  return packages;
}

// ── Git detection ─────────────────────────────────────────────────────────────

/**
 * Detecta paquetes con cambios, combinando dos fuentes:
 *  1. Cambios commiteados en esta rama pero no en BASE_BRANCH (git merge-base + git diff <base> HEAD)
 *  2. Cambios locales sin commitear (staged + unstaged + untracked, git status --porcelain)
 * @param {Array<{ dir: string, pkgJson: object, pkgJsonPath: string }>} packages
 * @param {string} [baseBranch='origin/develop']
 * @returns {Promise<Array<{ dir: string, pkgJson: object, pkgJsonPath: string }>>}
 */
export async function detectChangedPackages(packages, baseBranch = 'origin/develop') {
  const changedFiles = new Set();

  // 1. Cambios commiteados en esta rama vs el punto de bifurcacion con la base
  try {
    let diffBase = baseBranch;
    try {
      const { stdout } = await execFileAsync('git', ['merge-base', 'HEAD', baseBranch], {
        cwd: ROOT_DIR,
        encoding: 'utf8'
      });
      diffBase = stdout.trim() || baseBranch;
    } catch {
      // Si no se puede calcular merge-base, se usa el ref base directamente.
    }

    const { stdout } = await execFileAsync('git', ['diff', '--name-only', diffBase, 'HEAD'], {
      cwd: ROOT_DIR,
      encoding: 'utf8'
    });
    for (const f of stdout.split('\n').filter(Boolean)) {
      changedFiles.add(f.trim().replace(/\\/g, '/'));
    }
  } catch {
    // Si el branch base no existe, se ignora silenciosamente
  }

  // 2. Cambios locales sin commitear (staged + unstaged + untracked)
  try {
    const { stdout } = await execFileAsync('git', ['status', '--porcelain'], { cwd: ROOT_DIR, encoding: 'utf8' });
    for (const line of stdout.split('\n').filter(Boolean)) {
      // Format: "XY filename" o "XY old -> new" (rename)
      const entry = line.slice(3).trim();
      const file = (entry.includes(' -> ') ? entry.split(' -> ')[1] : entry).trim();
      changedFiles.add(file.replace(/\\/g, '/'));
    }
  } catch (e) {
    throw new Error(`git status falló: ${e.message}`);
  }

  if (changedFiles.size === 0) return [];

  const results = await Promise.all(
    packages.map((pkg) => {
      const relDir = relative(ROOT_DIR, pkg.dir).replace(/\\/g, '/');
      const hasChanges = [...changedFiles].some((f) => f.startsWith(relDir + '/') || f === relDir);
      return hasChanges ? pkg : null;
    })
  );

  return results.filter(Boolean);
}

// ── Snapshot version ──────────────────────────────────────────────────────────

/**
 * @param {string} currentVersion
 * @param {number} timestamp
 * @returns {string}
 */
export function generateSnapshotVersion(currentVersion, timestamp) {
  const base = currentVersion.replace(/[-+].*$/, '');
  return `${base}-dev.${timestamp}`;
}

// ── Registry health & version check ──────────────────────────────────────────

/**
 * Comprueba si una versión concreta de un paquete ya existe en el registry.
 * @param {string} name
 * @param {string} version
 * @param {string} registryUrl
 * @returns {Promise<boolean>}
 */
async function checkVersionExists(name, version, registryUrl) {
  try {
    const { stdout } = await execFileAsync(
      'npm',
      ['view', `${name}@${version}`, 'version', '--registry', registryUrl],
      { encoding: 'utf8' }
    );
    return stdout.trim() === version;
  } catch {
    // exit code != 0 → versión no encontrada en el registry
    return false;
  }
}

/**
 * Verifica que Verdaccio está disponible.
 * @param {string} registryUrl
 * @returns {Promise<void>}
 */
export async function checkRegistryHealth(registryUrl) {
  try {
    const res = await fetch(`${registryUrl}/-/ping`, {
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) return;
    throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    throw new Error(
      `Verdaccio no responde en ${registryUrl} — ${e.message}\n` + `  Levanta Verdaccio con: pnpm run ci:dev:verdaccio`
    );
  }
}

// ── Publish (temporary directory approach) ─────────────────────────────────────

/**
 * Crea un directorio temporal con el contenido publicable de un paquete,
 * genera un package.json limpio (snapshot version + workspace:* resuelto),
 * y ejecuta pnpm publish desde allí. No modifica ningún archivo fuente.
 *
 * Para paquetes Angular con publishConfig.directory, copia desde ./dist/.
 * Para paquetes TS, ejecuta prepublishOnly si existe y copia desde el source.
 *
 * @param {{ dir: string, pkgJson: object, pkgJsonPath: string }} pkg
 * @param {string} snapshotVersion
 * @param {string} registryUrl
 * @param {boolean} dryRun
 * @param {Map<string, string>} snapshotVersionMap
 * @param {Map<string, object>} workspacePackageMap
 * @returns {Promise<{ name: string, version: string, success: boolean, error?: string }>}
 */
export async function publishPackage(
  pkg,
  snapshotVersion,
  registryUrl,
  dryRun,
  snapshotVersionMap,
  workspacePackageMap
) {
  const { name } = pkg.pkgJson;

  if (dryRun) {
    console.log(`${C.dim}[dry-run]${C.reset} ${C.cyan}${name}${C.reset} → ${C.yellow}${snapshotVersion}${C.reset}`);
    return { name, version: snapshotVersion, success: true };
  }

  // 1. Determinar qué directorio contiene el contenido a publicar
  const publishDir = pkg.pkgJson.publishConfig?.directory;
  const contentDir = publishDir ? join(pkg.dir, publishDir) : pkg.dir;

  // Para Angular, el contenido está en dist/ (ya construido)
  // Para paquetes TS, ejecutamos prepublishOnly si existe para construir
  if (!publishDir && pkg.pkgJson.scripts?.prepublishOnly) {
    console.log(`${C.dim}[build]${C.reset} ${name} — ejecutando prepublishOnly...`);
    try {
      await execFileAsync('pnpm', ['run', 'prepublishOnly'], {
        cwd: pkg.dir,
        encoding: 'utf8'
      });
    } catch (e) {
      return { name, version: snapshotVersion, success: false, error: `prepublishOnly falló: ${e.message}` };
    }
  }

  // 2. Crear directorio temporal
  const tmpDir = await mkdtemp(join(tmpdir(), `snapshot-${basename(name)}-`));
  tempDirs.add(tmpDir);

  try {
    // 3. Copiar contenido publicable al temporal
    await cp(contentDir, tmpDir, { recursive: true, force: true });

    // 4. Generar package.json limpio con snapshot version y workspace:* resuelto
    const sourcePkgPath = join(tmpDir, 'package.json');
    let pkgJson;
    try {
      pkgJson = JSON.parse(await readFile(sourcePkgPath, 'utf8'));
    } catch {
      // Si falla (ej: TS package sin build), usar el source package.json
      pkgJson = { ...pkg.pkgJson };
    }
    const patched = buildPatchedPkgJson(pkgJson, snapshotVersion, snapshotVersionMap, workspacePackageMap);
    // Limpiar publishConfig.directory (irrelevante en el temporal — ya estamos en el dir de publicación)
    if (patched.publishConfig) {
      delete patched.publishConfig;
    }
    await writeFile(sourcePkgPath, JSON.stringify(patched, null, 2) + '\n', 'utf8');
    // Limpiar .gitkeep, .npmignore y otros ficheros que puedan interferir
    for (const f of ['pnpm-lock.yaml', '.npmrc', '.gitkeep']) {
      const fp = join(tmpDir, f);
      if (existsSync(fp)) await rm(fp, { force: true });
    }

    // 5. Ejecutar pnpm publish desde el temporal
    await runPublish(tmpDir, registryUrl, ['--tag', 'dev']);
    return { name, version: snapshotVersion, success: true };
  } catch (e) {
    const detail = [e.message, e.stderr].filter(Boolean).join('\n');
    return { name, version: snapshotVersion, success: false, error: detail };
  } finally {
    // 6. Limpiar directorio temporal
    tempDirs.delete(tmpDir);
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Ejecuta pnpm publish en el directorio dado y captura la salida.
 * @param {string} dir
 * @param {string} registryUrl
 * @param {string[]} extraFlags
 * @returns {Promise<{ stdout: string, stderr: string }>}
 */
function runPublish(dir, registryUrl, extraFlags = []) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    const proc = spawn('pnpm', ['publish', '--registry', registryUrl, '--no-git-checks', ...extraFlags], {
      cwd: dir,
      shell: false,
      env: buildPnpmPublishEnv()
    });

    proc.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const err = Object.assign(new Error(`pnpm publish salió con código ${code}`), { stdout, stderr });
        reject(err);
      }
    });

    proc.on('error', reject);
  });
}

function buildPnpmPublishEnv() {
  return {
    ...process.env,
    // El modo snapshot parchea temporalmente versiones del workspace antes
    // del build. pnpm 11 puede interpretarlo como un lockfile desactualizado
    // e intentar un `pnpm install` interactivo dentro de este subproceso.
    pnpm_config_verify_deps_before_run:
      process.env.pnpm_config_verify_deps_before_run ?? 'false',
    // Durante el publish de paquetes Angular desde dist/, auto-instalar peers
    // hace que pnpm intente resolver paquetes privados @proteo/* contra npmjs.
    pnpm_config_auto_install_peers:
      process.env.pnpm_config_auto_install_peers ?? 'false'
  };
}

/**
 * Obtiene la versión real de un paquete del workspace desde su package.json.
 * @param {string} name
 * @param {Map<string, object>} workspacePackageMap
 * @param {Map<string, string>} snapshotVersionMap
 * @returns {string|undefined}
 */
function resolveWorkspaceDep(name, workspacePackageMap, snapshotVersionMap) {
  // 1. Si es un paquete que vamos a publicar con snapshot, usar su snapshot
  if (snapshotVersionMap.has(name)) return snapshotVersionMap.get(name);
  // 2. Si tenemos su package.json real, usar su versión
  const pkg = workspacePackageMap.get(name);
  if (pkg) return pkg.pkgJson.version;
  return undefined;
}

/**
 * Construye un package.json parcheado con la versión snapshot y las deps internas actualizadas.
 * Resuelve todas las referencias workspace:* a versiones concretas.
 * @param {object} pkgJson
 * @param {string} snapshotVersion
 * @param {Map<string, string>} snapshotVersionMap
 * @param {Map<string, object>} workspacePackageMap
 * @returns {object}
 */
function buildPatchedPkgJson(pkgJson, snapshotVersion, snapshotVersionMap, workspacePackageMap) {
  const patched = { ...pkgJson, version: snapshotVersion };

  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    if (!patched[field]) continue;
    const updated = { ...patched[field] };
    for (const [dep, ver] of Object.entries(updated)) {
      if (typeof ver === 'string' && ver.startsWith('workspace:')) {
        const resolved = resolveWorkspaceDep(dep, workspacePackageMap, snapshotVersionMap);
        if (resolved) {
          // Preservar el rango si usa workspace:^ o workspace:~
          const protocol = ver.slice('workspace:'.length);
          if (protocol === '*' || protocol === '^' || protocol === '~') {
            updated[dep] = protocol === '*' ? resolved : `${protocol}${resolved}`;
          } else {
            updated[dep] = resolved;
          }
        }
      }
    }
    patched[field] = updated;
  }

  return patched;
}

// ── Workspace dependency graph ────────────────────────────────────────────────

const PUBLISH_DEP_FIELDS = ['dependencies', 'peerDependencies', 'optionalDependencies'];

/**
 * @param {{ pkgJson: object }} pkg
 * @param {Map<string, { pkgJson: object }>} workspacePackageMap
 * @returns {string[]}
 */
function getWorkspaceDependencyNames(pkg, workspacePackageMap) {
  const names = new Set();

  for (const field of PUBLISH_DEP_FIELDS) {
    const deps = pkg.pkgJson[field];
    if (!deps) continue;

    for (const dep of Object.keys(deps)) {
      const workspacePkg = workspacePackageMap.get(dep);
      if (workspacePkg && !workspacePkg.pkgJson.private) names.add(dep);
    }
  }

  return [...names];
}

/**
 * @param {Array<{ pkgJson: object }>} packages
 * @returns {{ byName: Map<string, object>, dependenciesByName: Map<string, Set<string>>, dependentsByName: Map<string, Set<string>> }}
 */
function buildWorkspaceGraph(packages) {
  const byName = new Map(packages.map((pkg) => [pkg.pkgJson.name, pkg]));
  const dependenciesByName = new Map(packages.map((pkg) => [pkg.pkgJson.name, new Set()]));
  const dependentsByName = new Map(packages.map((pkg) => [pkg.pkgJson.name, new Set()]));

  for (const pkg of packages) {
    const name = pkg.pkgJson.name;
    for (const dep of getWorkspaceDependencyNames(pkg, byName)) {
      dependenciesByName.get(name)?.add(dep);
      dependentsByName.get(dep)?.add(name);
    }
  }

  return { byName, dependenciesByName, dependentsByName };
}

/**
 * @param {Iterable<string>} seedNames
 * @param {Map<string, Set<string>>} adjacency
 * @returns {Set<string>}
 */
function collectGraphClosure(seedNames, adjacency) {
  const visited = new Set(seedNames);
  const queue = [...seedNames];

  while (queue.length > 0) {
    const name = queue.shift();
    for (const next of adjacency.get(name) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push(next);
    }
  }

  return visited;
}

/**
 * @param {{ dir: string, pkgJson: object }} pkg
 * @returns {string}
 */
function publishContentPackageJsonPath(pkg) {
  const publishDir = pkg.pkgJson.publishConfig?.directory;
  return publishDir ? join(pkg.dir, publishDir, 'package.json') : pkg.pkgJsonPath;
}

/**
 * @param {{ dir: string, pkgJson: object }} pkg
 * @returns {boolean}
 */
function publishContentManifestMissing(pkg) {
  return !existsSync(publishContentPackageJsonPath(pkg));
}

/**
 * @param {{ pkgJson: object }} pkg
 * @param {Set<string>} seedNames
 * @returns {boolean}
 */
function shouldBuildPackage(pkg, seedNames) {
  if (!pkg.pkgJson.scripts?.build) return false;
  return seedNames.has(pkg.pkgJson.name) || publishContentManifestMissing(pkg);
}

/**
 * @param {Array<{ dir: string, pkgJson: object, pkgJsonPath: string }>} seedPackages
 * @param {Array<{ dir: string, pkgJson: object, pkgJsonPath: string }>} allPackages
 * @returns {{ seedPackages: Array<object>, publishPackages: Array<object>, buildPackages: Array<object>, dependencyNames: Set<string>, dependentNames: Set<string> }}
 */
export function createSnapshotPublishPlan(seedPackages, allPackages) {
  const nonPrivatePackages = allPackages.filter((pkg) => !pkg.pkgJson.private);
  const graph = buildWorkspaceGraph(nonPrivatePackages);
  const seedNames = new Set(seedPackages.map((pkg) => pkg.pkgJson.name));
  const dependentNames = collectGraphClosure(seedNames, graph.dependentsByName);
  const publishNames = collectGraphClosure(dependentNames, graph.dependenciesByName);
  const dependencyNames = new Set([...publishNames].filter((name) => !dependentNames.has(name)));

  const publishPackages = nonPrivatePackages.filter((pkg) => publishNames.has(pkg.pkgJson.name));
  const buildPackages = publishPackages.filter((pkg) => shouldBuildPackage(pkg, seedNames));

  return {
    seedPackages,
    publishPackages,
    buildPackages,
    dependencyNames,
    dependentNames
  };
}

// ── Snapshot build + pnpm recursive publish ───────────────────────────────────

/**
 * @param {Array<{ dir: string }>} packages
 * @returns {string[]}
 */
function buildFilterArgs(packages) {
  return packages.flatMap((pkg) => ['--filter', `./${relative(ROOT_DIR, pkg.dir).replace(/\\/g, '/')}`]);
}

/**
 * @param {string[]} args
 * @returns {string}
 */
function formatPnpmCommand(args) {
  const filterCount = args.filter((arg) => arg === '--filter').length;
  if (filterCount <= 3) return `pnpm ${args.join(' ')}`;

  const compact = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--filter') {
      compact.push(`--filter <${filterCount} paquetes>`);
      i++;
      while (args[i + 1] === '--filter') i += 2;
    } else {
      compact.push(args[i]);
    }
  }

  return `pnpm ${compact.join(' ')}`;
}

/**
 * Ejecuta pnpm sin capturar stdout/stderr en memoria.
 * @param {string[]} args
 * @returns {Promise<void>}
 */
function runPnpm(args) {
  return new Promise((resolvePromise, reject) => {
    const proc = spawn('pnpm', args, {
      cwd: ROOT_DIR,
      shell: false,
      stdio: 'inherit',
      env: buildPnpmPublishEnv()
    });

    proc.on('close', (code, signal) => {
      const command = formatPnpmCommand(args);
      if (code === 0) {
        resolvePromise();
      } else if (signal) {
        reject(new Error(`${command} terminó por ${signal}`));
      } else {
        reject(new Error(`${command} salió con código ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

/**
 * @param {Array<{ pkgJson: object }>} packages
 * @param {number} timestamp
 * @param {boolean} success
 * @param {string} [error]
 * @returns {Array<{ name: string, version: string, success: boolean, error?: string }>}
 */
function buildPublishResults(packages, timestamp, success, error) {
  return packages.map((pkg) => ({
    name: pkg.pkgJson.name,
    version: generateSnapshotVersion(pkg.pkgJson.version, timestamp),
    success,
    ...(error ? { error } : {})
  }));
}

/**
 * @param {string} manifestPath
 * @param {string} snapshotVersion
 * @param {string} registryUrl
 * @param {Map<string, string>} snapshotVersionMap
 * @param {Map<string, object>} workspacePackageMap
 * @returns {Promise<boolean>}
 */
async function patchManifestVersion(
  manifestPath,
  snapshotVersion,
  registryUrl,
  snapshotVersionMap,
  workspacePackageMap
) {
  if (!existsSync(manifestPath)) return false;

  await rememberPackageJson(manifestPath);
  const pkgJson = JSON.parse(await readFile(manifestPath, 'utf8'));
  const publishConfig = { ...(pkgJson.publishConfig ?? {}), registry: registryUrl };
  const patched = buildPatchedPkgJson(pkgJson, snapshotVersion, snapshotVersionMap, workspacePackageMap);
  patched.publishConfig = publishConfig;

  await writeFile(manifestPath, JSON.stringify(patched, null, 2) + '\n', 'utf8');
  return true;
}

/**
 * Parchea temporalmente los package.json raíz con versión snapshot.
 * pnpm publish -r usa esas versiones para resolver automáticamente workspace:*.
 * @param {Array<{ pkgJson: object, pkgJsonPath: string }>} packages
 * @param {number} timestamp
 * @param {string} registryUrl
 * @param {Map<string, string>} snapshotVersionMap
 * @param {Map<string, object>} workspacePackageMap
 */
async function patchRootSnapshotVersions(packages, timestamp, registryUrl, snapshotVersionMap, workspacePackageMap) {
  for (const pkg of packages) {
    const snapshotVersion = generateSnapshotVersion(pkg.pkgJson.version, timestamp);
    const publishManifestPath = publishContentPackageJsonPath(pkg);

    if (publishManifestPath !== pkg.pkgJsonPath && existsSync(publishManifestPath)) {
      await rememberPackageJson(publishManifestPath);
    }

    await patchManifestVersion(pkg.pkgJsonPath, snapshotVersion, registryUrl, snapshotVersionMap, workspacePackageMap);
  }
}

/**
 * Parchea package.json del directorio publicable (dist en Angular) después del build.
 * @param {Array<{ pkgJson: object, pkgJsonPath: string }>} packages
 * @param {number} timestamp
 * @param {string} registryUrl
 * @param {Map<string, string>} snapshotVersionMap
 * @param {Map<string, object>} workspacePackageMap
 */
async function patchPublishContentSnapshotVersions(
  packages,
  timestamp,
  registryUrl,
  snapshotVersionMap,
  workspacePackageMap
) {
  for (const pkg of packages) {
    const publishManifestPath = publishContentPackageJsonPath(pkg);
    if (publishManifestPath === pkg.pkgJsonPath) continue;

    const snapshotVersion = generateSnapshotVersion(pkg.pkgJson.version, timestamp);
    const patched = await patchManifestVersion(
      publishManifestPath,
      snapshotVersion,
      registryUrl,
      snapshotVersionMap,
      workspacePackageMap
    );
    if (!patched) {
      throw new Error(
        `${pkg.pkgJson.name} usa publishConfig.directory pero no existe ${relative(ROOT_DIR, publishManifestPath)}`
      );
    }
  }
}

/**
 * @param {Array<{ pkgJson: object }>} packages
 * @returns {Array<{ pkgJson: object }>}
 */
function sortPackagesByWorkspaceDependencies(packages) {
  const byName = new Map(packages.map((pkg) => [pkg.pkgJson.name, pkg]));
  const visiting = new Set();
  const visited = new Set();
  const sorted = [];

  const visit = (pkg) => {
    const name = pkg.pkgJson.name;
    if (visited.has(name)) return;
    if (visiting.has(name)) return;

    visiting.add(name);
    for (const depName of getWorkspaceDependencyNames(pkg, byName)) {
      const dep = byName.get(depName);
      if (dep) visit(dep);
    }
    visiting.delete(name);
    visited.add(name);
    sorted.push(pkg);
  };

  for (const pkg of packages) visit(pkg);
  return sorted;
}

/**
 * @param {Array<{ dir: string, pkgJson: object }>} packages
 * @returns {Promise<void>}
 */
async function buildPackages(packages) {
  if (packages.length === 0) {
    console.log(`${C.dim}[build]${C.reset} No hay paquetes modificados que requieran build.`);
    return;
  }
  console.log(`${C.dim}[build]${C.reset} Ejecutando build de paquetes afectados...`);
  for (const pkg of sortPackagesByWorkspaceDependencies(packages)) {
    console.log(`${C.dim}[build]${C.reset} ${C.cyan}${pkg.pkgJson.name}${C.reset}`);
    await runPnpm(['run', '--filter', `./${relative(ROOT_DIR, pkg.dir).replace(/\\/g, '/')}`, '--if-present', 'build']);
  }
}

/**
 * @param {Array<{ pkgJson: object }>} packages
 * @param {string} registryUrl
 * @returns {Promise<void>}
 */
async function publishPackagesWithPnpm(packages, registryUrl) {
  console.log(
    `${C.dim}[publish]${C.reset} Publicando ${packages.length} snapshot(s) con un único pnpm publish -r --tag dev en ${registryUrl}...`
  );
  await runPnpm([
    'publish',
    '-r',
    ...buildFilterArgs(packages),
    '--tag',
    'dev',
    '--registry',
    registryUrl,
    '--no-git-checks'
  ]);
}

/**
 * Orquesta snapshot publish con build previo y pnpm publish recursivo.
 * @param {Array<{ dir: string, pkgJson: object, pkgJsonPath: string }>} packages
 * @param {Array<{ dir: string, pkgJson: object, pkgJsonPath: string }>} _allPackages
 * @param {number} timestamp
 * @param {string} registryUrl
 * @param {number} _concurrency
 * @param {boolean} dryRun
 * @returns {Promise<Array<{ name: string, version: string, success: boolean, error?: string }>>}
 */
export async function publishAll(packages, _allPackages, timestamp, registryUrl, _concurrency = 4, dryRun = false) {
  const plan = createSnapshotPublishPlan(packages, _allPackages);
  const workspacePackageMap = new Map(_allPackages.map((pkg) => [pkg.pkgJson.name, pkg]));
  const snapshotVersionMap = new Map(
    plan.publishPackages.map((pkg) => [pkg.pkgJson.name, generateSnapshotVersion(pkg.pkgJson.version, timestamp)])
  );

  if (dryRun) {
    for (const r of buildPublishResults(plan.publishPackages, timestamp, true)) {
      console.log(`${C.dim}[dry-run]${C.reset} ${C.cyan}${r.name}${C.reset} → ${C.yellow}${r.version}${C.reset}`);
    }
    return buildPublishResults(plan.publishPackages, timestamp, true);
  }

  try {
    await patchRootSnapshotVersions(
      plan.publishPackages,
      timestamp,
      registryUrl,
      snapshotVersionMap,
      workspacePackageMap
    );
    await buildPackages(plan.buildPackages);
    const results = [];
    for (const pkg of sortPackagesByWorkspaceDependencies(plan.publishPackages)) {
      const snapshotVersion = generateSnapshotVersion(pkg.pkgJson.version, timestamp);
      results.push(await publishPackage(
        pkg,
        snapshotVersion,
        registryUrl,
        false,
        snapshotVersionMap,
        workspacePackageMap
      ));
    }
    return results;
  } catch (e) {
    return buildPublishResults(plan.publishPackages, timestamp, false, e.message);
  } finally {
    await restorePatchedPackageJsons();
  }
}

// ── Sync publish (exact version, skip if exists) ──────────────────────────────

/**
 * Publica un paquete con su versión real si no existe ya en el registry.
 * No modifica ningún package.json.
 * @param {{ dir: string, pkgJson: object }} pkg
 * @param {string} registryUrl
 * @param {boolean} dryRun
 * @returns {Promise<{ name: string, version: string, success: boolean, skipped?: boolean, error?: string }>}
 */
/**
 * @param {object} pkg
 * @param {Map<string, object>} workspacePackageMap
 * @param {string} registryUrl
 * @param {boolean} dryRun
 */
async function syncPublishPackage(pkg, workspacePackageMap, registryUrl, dryRun) {
  const { name, version } = pkg.pkgJson;

  const exists = await checkVersionExists(name, version, registryUrl);
  if (exists) {
    console.log(`  ${C.dim}[skip] ${name}@${version} — ya existe en Verdaccio${C.reset}`);
    return { name, version, success: true, skipped: true };
  }

  if (dryRun) {
    console.log(`${C.dim}[dry-run]${C.reset} ${C.cyan}${name}@${version}${C.reset} — se publicaría`);
    return { name, version, success: true };
  }

  const publishDir = pkg.pkgJson.publishConfig?.directory;
  const contentDir = publishDir ? join(pkg.dir, publishDir) : pkg.dir;
  const tmpDir = await mkdtemp(join(tmpdir(), `sync-${basename(name)}-`));

  try {
    await cp(contentDir, tmpDir, { recursive: true, force: true });
    const pkgPath = join(tmpDir, 'package.json');
    const pkgJson = JSON.parse(await readFile(pkgPath, 'utf8'));

    // Resolver workspace:* y limpiar publishConfig (no podemos usar buildPatchedPkgJson
    // porque no tenemos snapshotVersionMap — publicamos versión real)
    for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
      if (!pkgJson[field]) continue;
      for (const [dep, ver] of Object.entries(pkgJson[field])) {
        if (typeof ver === 'string' && ver.startsWith('workspace:')) {
          const resolved = resolveWorkspaceDep(dep, workspacePackageMap, new Map());
          if (resolved) {
            pkgJson[field][dep] = resolved;
          }
        }
      }
    }

    if (pkgJson.publishConfig) delete pkgJson.publishConfig;
    await writeFile(pkgPath, JSON.stringify(pkgJson, null, 2) + '\n', 'utf8');
    for (const f of ['pnpm-lock.yaml', '.npmrc', '.gitkeep']) {
      const fp = join(tmpDir, f);
      if (existsSync(fp)) await rm(fp, { force: true });
    }
    await runPublish(tmpDir, registryUrl);
    return { name, version, success: true };
  } catch (e) {
    const detail = [e.message, e.stderr].filter(Boolean).join('\n');
    return { name, version, success: false, error: detail };
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Publica todos los paquetes del workspace con su versión real (concurrencia limitada).
 * @param {Array<{ dir: string, pkgJson: object, pkgJsonPath: string }>} packages
 * @param {string} registryUrl
 * @param {number} concurrency
 * @param {boolean} dryRun
 * @returns {Promise<Array<{ name: string, version: string, success: boolean, skipped?: boolean, error?: string }>>}
 */
async function syncPublishAll(packages, allPackages, registryUrl, concurrency = 4, dryRun = false) {
  const workspacePackageMap = new Map(allPackages.map((pkg) => [pkg.pkgJson.name, pkg]));
  const queue = [...packages];
  const results = [];

  async function worker() {
    while (queue.length > 0) {
      const pkg = queue.shift();
      if (!pkg) break;
      results.push(await syncPublishPackage(pkg, workspacePackageMap, registryUrl, dryRun));
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, packages.length) }, worker));
  return results;
}

// ── Output ────────────────────────────────────────────────────────────────────

const ANSI_RE = new RegExp('\x1b\\[[0-9;]*[A-Za-z]', 'g'); // eslint-disable-line no-control-regex

/** Longitud visual de un string (ANSI stripped, emojis = 2 cols) */
function visLen(s) {
  const stripped = s.replace(ANSI_RE, '');
  return [...stripped].reduce((n, ch) => n + (ch.codePointAt(0) > 0x7e ? 2 : 1), 0);
}

const BOX_W = 67; // ancho interior de la caja (entre los dos │)

const boxLine = (char = '─') => char.repeat(BOX_W);

const padLine = (content = '') => {
  const pad = Math.max(0, BOX_W - visLen(content));
  return `│${content}${' '.repeat(pad)}│`;
};

const centerLine = (text) => {
  const len = visLen(text);
  const left = Math.floor((BOX_W - len) / 2);
  const right = BOX_W - len - left;
  return `│${' '.repeat(left)}${text}${' '.repeat(right)}│`;
};

const commandLines = (cmd, pkgs, registryUrl) => {
  return [`${cmd} ${pkgs.join(' ')} --registry ${registryUrl} --prefer-online --force --save-exact`];
};

const summarizePackageNames = (names) => {
  if (names.length <= 8) return names.join(', ');
  return `${names.slice(0, 8).join(', ')} y ${names.length - 8} más`;
};

/**
 * Imprime el resumen visual en terminal usando ANSI escape codes.
 * @param {Array<{ name: string, version: string, success: boolean, error?: string }>} results
 * @param {string} registryUrl
 */
export function printResults(results, registryUrl = 'http://localhost:4873') {
  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  const out = [
    `┌${boxLine()}┐`,
    centerLine(`${C.bold}📦 Snapshot Publish Results${C.reset}`),
    `├${boxLine()}┤`,
    padLine()
  ];

  for (const r of results) {
    if (r.success) {
      out.push(padLine(`  ${C.green}✅${C.reset} ${C.cyan}${r.name}${C.reset} → ${C.yellow}${r.version}${C.reset}`));
    } else {
      out.push(padLine(`  ${C.red}❌ ${r.name}${C.reset} → ${C.red}FAILED (see error below)${C.reset}`));
    }
  }

  out.push(padLine());

  if (succeeded.length > 0) {
    const exactPkgs = succeeded.map((r) => `${r.name}@${r.version}`);

    out.push(`├${boxLine()}┤`);
    out.push(padLine(`  ${C.bold}Versiones publicadas:${C.reset}`));
    out.push(padLine());
    for (const pkg of exactPkgs) out.push(padLine(`  ${pkg}`));
    out.push(padLine());
  }

  out.push(`└${boxLine()}┘`);

  console.log('\n' + out.join('\n'));

  if (succeeded.length > 0) {
    const packageNames = succeeded.map((r) => `${r.name}@dev`);
    console.log(`\n${C.bold}Comandos copiables para actualizar en la app consumidora:${C.reset}`);
    console.log(commandLines('npm install', packageNames, registryUrl).join('\n'));
  }

  if (failed.length > 0) {
    console.error(`\n${C.red}${C.bold}Errores de publicación:${C.reset}`);
    const groupedErrors = new Map();
    for (const r of failed) {
      const error = r.error || 'Error desconocido';
      groupedErrors.set(error, [...(groupedErrors.get(error) ?? []), r.name]);
    }

    for (const [error, names] of groupedErrors) {
      console.error(`\n${C.red}[${names.length} paquete(s)]${C.reset} ${summarizePackageNames(names)}`);
      console.error(error);
    }
  }
}

// ── Watch mode ────────────────────────────────────────────────────────────────

/**
 * Modo watch: republica automáticamente cuando detecta cambios en el workspace.
 * @param {Array<{ dir: string, pkgJson: object, pkgJsonPath: string }>} allPackages
 * @param {{ dryRun: boolean, registry: string }} opts
 * @returns {Promise<never>}
 */
async function runWatchMode(allPackages, { dryRun, registry }) {
  console.log(
    `${C.cyan}[watch]${C.reset} Observando ${allPackages.length} paquete(s)... ${C.dim}(Ctrl+C para salir)${C.reset}\n`
  );

  let debounceTimer = null;

  const trigger = async () => {
    const changed = await detectChangedPackages(allPackages).catch((e) => {
      console.error(`${C.red}[watch] Error detectando cambios: ${e.message}${C.reset}`);
      return [];
    });

    if (changed.length === 0) return;

    console.log(`\n${C.cyan}[watch]${C.reset} ${changed.length} paquete(s) con cambios — publicando...`);
    const timestamp = Date.now();
    const results = await publishAll(changed, allPackages, timestamp, registry, 4, dryRun);
    printResults(results, registry);
  };

  for (const pkg of allPackages) {
    watch(pkg.dir, { recursive: true }, (_event, filename) => {
      if (!filename) return;
      if (filename.includes('node_modules')) return;
      if (filename.endsWith('package.json')) return;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(trigger, 500);
    });
  }

  // Mantener el proceso vivo
  return new Promise(() => {});
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Node >= 18 requerido por node:test y fetch nativo
  const [major] = process.versions.node.split('.').map(Number);
  if (major < 18) {
    console.error(`${C.red}[error] Se requiere Node.js >= 18 (actual: ${process.versions.node})${C.reset}`);
    process.exit(1);
  }

  const args = parseArgs(process.argv);

  const { packages: workspaceGlobs } = await readWorkspaceConfig(ROOT_DIR);
  const allPackages = await resolveWorkspacePackages(ROOT_DIR, workspaceGlobs);

  if (allPackages.length === 0) {
    console.error(`${C.yellow}[warn] No se encontraron paquetes publicables en el workspace.${C.reset}`);
    process.exit(0);
  }

  // ── Modo sync: publica todos con versión real, salta los que ya existen ──────
  const nonPrivatePackages = allPackages.filter((p) => !p.pkgJson.private);
  for (const p of allPackages.filter((p) => p.pkgJson.private)) {
    console.warn(`${C.dim}[skip] ${p.pkgJson.name} es privado.${C.reset}`);
  }

  if (args.sync) {
    const targets =
      args.packages.length > 0
        ? nonPrivatePackages.filter((p) => args.packages.includes(p.pkgJson.name))
        : nonPrivatePackages;

    console.log(`\n${C.bold}Sync: ${targets.length} paquete(s) — publicando versiones reales${C.reset}\n`);

    if (!args.dryRun) await checkRegistryHealth(args.registry);

    const results = await syncPublishAll(targets, allPackages, args.registry, 4, args.dryRun);
    const published = results.filter((r) => r.success && !r.skipped);
    const skipped = results.filter((r) => r.skipped);
    const failed = results.filter((r) => !r.success);

    console.log(`\n${C.bold}Resultado:${C.reset}`);
    console.log(`  ${C.green}Publicados:${C.reset} ${published.length}`);
    console.log(`  ${C.dim}Ya existían: ${skipped.length}${C.reset}`);
    if (failed.length > 0) {
      console.log(`  ${C.red}Fallidos:   ${failed.length}${C.reset}`);
      for (const r of failed) {
        console.error(`\n${C.red}[${r.name}]${C.reset} ${r.error}`);
      }
    }
    process.exit(failed.length > 0 ? 1 : 0);
  }

  // ── Modo normal: snapshot de paquetes cambiados ───────────────────────────
  let targets;

  if (args.packages.length > 0) {
    targets = nonPrivatePackages.filter((p) => args.packages.includes(p.pkgJson.name));
    const notFound = args.packages.filter((n) => !nonPrivatePackages.find((p) => p.pkgJson.name === n));
    if (notFound.length > 0) {
      console.warn(`${C.yellow}[warn] No encontrados en workspace: ${notFound.join(', ')}${C.reset}`);
    }
  } else {
    targets = await detectChangedPackages(nonPrivatePackages);
  }

  // Modo watch — ignora targets y observa todo
  if (args.watchMode) {
    await checkRegistryHealth(args.registry);
    await runWatchMode(allPackages, args);
    return;
  }

  if (targets.length === 0) {
    console.log(`${C.dim}Sin paquetes modificados. Nada que publicar.${C.reset}`);
    process.exit(0);
  }

  const timestamp = Date.now();
  const plan = createSnapshotPublishPlan(targets, allPackages);

  console.log(`\n${C.bold}Paquetes semilla (${targets.length}):${C.reset}`);
  for (const pkg of targets) {
    console.log(`  ${C.cyan}${pkg.pkgJson.name}${C.reset}`);
  }

  console.log(`\n${C.bold}Paquetes con build (${plan.buildPackages.length}):${C.reset}`);
  if (plan.buildPackages.length === 0) {
    console.log(`  ${C.dim}Ninguno: los paquetes añadidos al batch se republican sin rebuild.${C.reset}`);
  } else {
    for (const pkg of plan.buildPackages) {
      console.log(`  ${C.cyan}${pkg.pkgJson.name}${C.reset}`);
    }
  }

  console.log(`\n${C.bold}Paquetes a publicar (${plan.publishPackages.length}):${C.reset}`);
  for (const pkg of plan.publishPackages) {
    const snap = generateSnapshotVersion(pkg.pkgJson.version, timestamp);
    console.log(
      `  ${C.cyan}${pkg.pkgJson.name}${C.reset}  ${C.dim}${pkg.pkgJson.version}${C.reset} → ${C.yellow}${snap}${C.reset}`
    );
  }
  console.log();

  if (!args.dryRun) {
    await checkRegistryHealth(args.registry);
  }

  const results = await publishAll(targets, allPackages, timestamp, args.registry, 4, args.dryRun);

  printResults(results, args.registry);

  process.exit(results.some((r) => !r.success) ? 1 : 0);
}

function isMainModule() {
  try {
    return process.argv[1] && realpathSync(process.argv[1]) === __filename;
  } catch {
    return false;
  }
}

if (isMainModule()) {
  main().catch((e) => {
    console.error(`${C.red}[error fatal] ${e.message}${C.reset}`);
    process.exit(1);
  });
}
