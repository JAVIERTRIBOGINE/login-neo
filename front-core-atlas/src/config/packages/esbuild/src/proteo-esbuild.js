import esbuild from 'esbuild';
import { cwd } from 'node:process';
import { join } from 'path';
import { externalChecker } from './esbuild-external-checker.js';

const importConfig = (configFile) => import(configFile).then((m) => m.default || m.config);

export const proteoESbuild = async (configFile = join(cwd(), './esbuild.config.js')) => {
  const config = await importConfig(configFile).catch(() => importConfig('./config.js'));
  await externalChecker(config)
    .then(esbuild.build)
    .catch(() => process.exit(1));
};
