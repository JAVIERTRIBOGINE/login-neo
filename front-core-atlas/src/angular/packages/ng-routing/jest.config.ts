/* eslint-disable */
import { createEsmPreset } from 'jest-preset-angular/presets';

const presetConfig = createEsmPreset({
  tsconfig: '<rootDir>/tsconfig.spec.json'
});

export default {
  ...presetConfig,
  displayName: 'ng-routing',
  moduleNameMapper: {
    ...presetConfig.moduleNameMapper,
    '^rxjs$': '<rootDir>/../../../../node_modules/rxjs/dist/cjs/index.js',
    '^rxjs/(.*)$': '<rootDir>/../../../../node_modules/rxjs/dist/cjs/$1',
    '^@angular-architects/module-federation$': '<rootDir>/../../mocks/module-federation.cjs',
    '^@angular-architects/module-federation-runtime$': '<rootDir>/../../mocks/module-federation-runtime.cjs'
  },
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../../../coverage/angular/ng-routing',
  modulePathIgnorePatterns: ['<rootDir>/dist/']
};
