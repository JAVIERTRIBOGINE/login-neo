import { readFileSync } from 'fs';
import { cwd } from 'node:process';
import { join } from 'path';

const log = {
  warn: (...args) => process.stdout.write(`[WARN] ${args.join(' ')}\n`)
};

export const externalChecker = async (config, packageFile = join(cwd(), './package.json')) => {
  const packageData = readFileSync(packageFile, 'utf8');
  const { dependencies = {} } = JSON.parse(packageData);
  const dependencyNames = Object.keys(dependencies);
  const { external } = config;
  const diff = dependencyNames.filter((dependency) => external.indexOf(dependency) < 0);
  if (diff.length > 0) {
    config.external.push(...diff);
    log.warn(`Expected to include ${diff.join(', ')} as external in the build configuration`);
  }
  return config;
};
