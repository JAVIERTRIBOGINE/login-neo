import { createRequire } from 'module';
import { mergeCoverageReportFiles } from 'lcov-result-merger';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const createdRequire = createRequire(import.meta.url);
const glob = createdRequire('glob');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const log = {
  info: (...args) => process.stdout.write(`[INFO] ${args.join(' ')}\n`),
  error: (...args) => process.stderr.write(`[ERROR] ${args.join(' ')}\n`)
};

const coverageDir = path.join(rootDir, 'coverage');
const outputFile = path.join(coverageDir, 'lcov.info');

if (!fs.existsSync(coverageDir)) {
  fs.mkdirSync(coverageDir);
}

const lcovFiles = glob.sync('coverage/{typescript,angular,config}/*/lcov.info', { cwd: rootDir });

if (lcovFiles.length > 0) {
  const categories = fs.readdirSync(path.join(rootDir, 'src/typescript/packages'));

  const tempDir = fs.mkdtempSync(path.join(rootDir, 'coverage', '.tmp-'));
  const tempFiles = [];

  for (const lcovFile of lcovFiles) {
    const parts = lcovFile.split('/');
    const type = parts[1];
    const pkgName = parts[2];

    let sourcePrefix;
    if (type === 'angular') {
      sourcePrefix = `src/angular/packages/${pkgName}`;
    } else if (type === 'config') {
      sourcePrefix = `src/config/packages/${pkgName}`;
    } else if (type === 'typescript') {
      for (const cat of categories) {
        if (fs.existsSync(path.join(rootDir, 'src/typescript/packages', cat, pkgName))) {
          sourcePrefix = `src/typescript/packages/${cat}/${pkgName}`;
          break;
        }
      }
    }

    if (!sourcePrefix) {
      log.error(`Could not determine source prefix for ${lcovFile}`);
      continue;
    }

    const content = fs.readFileSync(path.join(rootDir, lcovFile), 'utf8');
    const transformed = content.replace(/^SF:(.+)$/gm, (_, sfPath) => `SF:${sourcePrefix}/${sfPath}`);

    const tempFile = path.join(tempDir, `${pkgName}.lcov`);
    fs.writeFileSync(tempFile, transformed);
    tempFiles.push(tempFile);
  }

  if (tempFiles.length > 0) {
    mergeCoverageReportFiles(tempFiles, { prependSourceFiles: false })
      .then((mergedReportPath) => {
        const mergedReport = fs.readFileSync(mergedReportPath, 'utf8');
        fs.writeFileSync(outputFile, mergedReport);
        log.info(`Cobertura combinada guardada en ${outputFile}`);
        fs.rmSync(tempDir, { recursive: true, force: true });
      })
      .catch((error) => {
        log.error('Error al combinar los informes de cobertura:', error);
        fs.rmSync(tempDir, { recursive: true, force: true });
      });
  } else {
    log.info('No se encontraron archivos lcov.info para combinar');
  }
} else {
  log.info('No se encontraron archivos lcov.info');
}
