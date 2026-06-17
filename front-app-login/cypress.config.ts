/* eslint-disable no-console */
import { defineConfig } from 'cypress';

export default defineConfig({
  component: {
    devServer: {
      framework: 'angular',
      bundler: 'webpack'
    },
    specPattern: '**/*.cy.js',
    excludeSpecPattern: '**/node_modules/**'
  },
  e2e: {
    setupNodeEvents(on) {
      on('task', {
        log(message) {
          console.log(message);

          return null;
        },
        table(message) {
          console.table(message);
          return null;
        }
      });
    },
    supportFile: 'cypress/support/e2e.ts',
    baseUrl: 'http://localhost:4200',
  }
});
