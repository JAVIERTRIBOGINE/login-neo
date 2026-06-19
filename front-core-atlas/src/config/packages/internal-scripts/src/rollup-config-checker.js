/* eslint-disable no-console */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const log = {
  info: (...args) => process.stdout.write(`[INFO] ${args.join(' ')}\n`)
};

export const rollupConfigChecker = (dirname = '') => {
  const packageFile = readFileSync(resolve(dirname, 'package.json'), 'utf8');
  const rollupConfig = readFileSync(resolve(dirname, 'rollup.config.mjs'), 'utf8');
  const { dependencies = [] } = JSON.parse(packageFile);
  Object.keys(dependencies).forEach((dependency) => {
    if (!rollupConfig.includes(dependency)) {
      log.info(`Expected rollup config to contain ${dependency} as external dependency`);
      log.info(`Dont forget to include it before release!`);
      process.exit(1);
    }
  });
};
