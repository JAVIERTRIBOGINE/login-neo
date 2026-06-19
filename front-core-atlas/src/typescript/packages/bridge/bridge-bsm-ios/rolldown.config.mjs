import { createRolldownConfig } from '@proteo/rolldown-config';
import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default createRolldownConfig({
  input: './src/index.ts',
  pkg
});
