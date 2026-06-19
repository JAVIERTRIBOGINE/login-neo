/* eslint-disable */
import { createEsmPreset } from 'jest-preset-angular/presets';

const presetConfig = createEsmPreset({
  tsconfig: '<rootDir>/tsconfig.spec.json'
});

export default {
  ...presetConfig,
  displayName: 'ng-legacy-loader',
  moduleNameMapper: {
    ...presetConfig.moduleNameMapper,
    '^rxjs$': '<rootDir>/../../../../node_modules/rxjs/dist/cjs/index.js',
    '^rxjs/(.*)$': '<rootDir>/../../../../node_modules/rxjs/dist/cjs/$1',
    '^@angular-architects/module-federation$': '<rootDir>/../../mocks/module-federation.cjs',
    '^@angular-architects/module-federation-runtime$': '<rootDir>/../../mocks/module-federation-runtime.cjs'
  },
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../../../coverage/angular/ng-legacy-loader',
  modulePathIgnorePatterns: ['<rootDir>/dist/']
};
