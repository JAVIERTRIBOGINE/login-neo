# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 4.1.3 - 11/04/2025

### 4.1.3 Added

- Added `sonar.project.properties` to add the correct confirguration

### 4.1.3 Updated

- Update config file env.json to add config for the new BridgeReverse functionallity & the new changes for the major version of TagManager
- Updated `@proteo` packages to latest versions available
  - `@proteo/cookie-utils` to ^1.0.3
  - `@proteo/data-manager` to ^2.1.9
  - `@proteo/date-utils` to ^1.3.11
  - `@proteo/event-bus` to ^1.0.8
  - `@proteo/feature-manager` to ^2.0.2
  - `@proteo/i18n-utils` to ^1.3.10
  - `@proteo/logger-utils` to ^1.1.1
  - `@proteo/ng-bootstrap` to ^2.1.4
  - `@proteo/ng-legacy-loader` to ^1.0.8
  - `@proteo/ng-routing` to ^2.1.4
  - `@proteo/ng-store` to ^1.0.3
  - `@proteo/ng-translate` to ^1.0.11
  - `@proteo/object-utils` to ^1.0.4
  - `@proteo/tag-manager` to ^2.0.1

## 4.1.2 - 12/03/2025

### 4.1.2 Updated

- Fix `env.json` local and configurations a format bug.
- Updated `@proteo` packages to latest versions available
  - `@proteo/data-manager` to ^2.1.3
  - `@proteo/date-utils` to ^1.3.9
  - `@proteo/ng-bootstrap` to ^2.1.2
  - `@proteo/ng-legacy-loader` to ^1.0.6
  - `@proteo/ng-routing` to ^2.1.2
  - `@proteo/ng-translate` to ^1.0.10
  - `@proteo/tag-manager` to ^1.2.4
  - `@proteo/types` to ^1.1.42


## 4.1.1 - 27/02/2025

### 4.1.1 Updated
- Updated `env.json` with `OPEN_IN_APP_URL, OPEN_BROWSER_URL, OPEN_UNIVERSAL_LINK` events
- Updated `@proteo` packages to latest versions available
  - `@proteo/data-manager` to ^2.1.2
  - `@proteo/ng-bootstrap` to ^2.1.0
  - `@proteo/ng-routing` to ^2.1.0
  - `@proteo/types` to ^1.1.39

## 4.1.0 - 19/02/2025

### 4.1.0 Added
- Added script for deploy with sematic version in `index.deploy.html`
- Updated `manifest.json` with `isAuthenticate` and `isPiloting`

### 4.1.0 Updated

- Updated `baseHref` in `angular.json` now is relative path
- Updated `@proteo` packages to latest versions available
  - `@proteo/data-manager` to ^2.1.1
  - `@proteo/ng-bootstrap` to ^2.0.0
  - `@proteo/ng-routing` to ^2.0.0
  - `@proteo/feature-manager` to ^2.0.1
  - `@proteo/types` to ^1.1.38

## 4.0.4 - 22/01/2025

### 4.0.4 Updated

- Updated `@proteo` packages to latest versions available
  - `@proteo/data-manager` to ^2.0.42
  - `@proteo/ng-bootstrap` to ^1.0.10
  - `@proteo/ng-legacy-loader` to ^1.0.5
  - `@proteo/ng-routing` to ^1.0.10
  - `@proteo/ng-translate` to ^1.0.7
  - `@proteo/types` to ^1.1.32

## 4.0.3 - 18/12/2024

### 4.0.3 Updated

- Updated `@proteo` packages to latest versions available
  - `@proteo/data-manager` to ^2.0.38
  - `@proteo/ng-bootstrap` to ^1.0.7
  - `@proteo/ng-legacy-loader` to ^1.0.4
  - `@proteo/ng-routing` to ^1.0.7
  - `@proteo/ng-store` to ^1.0.3
  - `@proteo/ng-translate` to ^1.0.5
  - `@proteo/tag-manager` to ^1.2.3
  - `@proteo/types` to ^1.1.27
  
## 4.0.2 - 20/11/2024

### 4.0.2 Updated

- Updated `browserslistrc` with the minimal supported browsers versions
- Updated configuration for TAG_MANAGER default inicialitation for TXP4 Driver
- Updated `@proteo` packages to latest versions available
  - `@proteo/data-manager` to 2.0.31
  - `@proteo/types` to 1.1.22
  - `@proteo/ng-bootstrap` ^1.0.3
  - `@proteo/ng-legacy-loader` ^1.0.2
  - `@proteo/ng-routing` ^1.0.3
  - `@proteo/ng-store` ^1.0.2
  - `@proteo/ng-translate` ^1.0.2

- Updated `eslint-plugin-cypress`: ^3.6.0,
  
## 4.0.1 - 29/10/2024

### 4.0.1 Updated

- Updated `@proteo` packages to latest versions available
  - `@proteo/data-manager` to 2.0.23
  - `@proteo/types` to 1.1.18
  - `@proteo/ng-bootstrap` ^1.0.1
  - `@proteo/ng-legacy-loader` ^1.0.1
  - `@proteo/ng-routing` ^1.0.1
  - `@proteo/ng-store` ^1.0.1
  - `@proteo/ng-translate` ^1.0.1

## 4.0.0 - 11/10/2024

### 4.0.0 Added

- Added the new packages corresponding to the ng-core monorepo distribution
  - `@proteo/ng-bootstrap` ^1.0.0
  - `@proteo/ng-legacy-loader` ^1.0.0
  - `@proteo/ng-routing` ^1.0.0
  - `@proteo/ng-store` ^1.0.0
  - `@proteo/ng-translate` ^1.0.0

### 4.0.0 Deleted

- Deleted the `@proteo/ng-core` package in favour of all the new packages added corresponding to the monorepo distribution

### 4.0.0 Updated

- Updated `@proteo` packages to latest versions available
  - `@proteo/data-manager` to 2.0.22
  - `@proteo/i18n-utils` to 1.3.8
  - `@proteo/date-utils` to 1.3.8
  - `@proteo/tag-manager` to 1.2.1
  - `@proteo/feature-manager` to 1.1.8
  - `@proteo/types` to 1.1.16

- Updated `webpack.config.js` so the packages `@proteo/ng-bootstrap` & `@proteo/ng-routing` can be shared through the module federation
- Updated `bootstrap.ts` to import the corresponding functions and classes from the new packages
- Updated `bootstrap-child.module.ts.template` to import the corresponding functions and classes from the new packages
- Updated `bootstrap-federated.module.ts.template` to import the corresponding functions and classes from the new packages
- Updated `info-page.component.ts` to import the corresponding functions and classes from the new packages
- Updated `error.component.ts` to import the corresponding functions and classes from the new packages

> If you are updating an existing project, you can follow the [migration guides](https://developer-portal-int-ns-docs.apps.int.aws.bancsabadell.com/Development/02-Frontend/02-Developer-Guides/12-Migrations/3-Core-ng-monorepo-migration-guide) available in the developer portal.

## 3.1.3 - 05/08/2024

### 3.1.2 Updated

- Updated `@proteo` packages to latest versions available
  - `@proteo/data-manager` to 2.0.14
  - `@proteo/ng-core` to 10.6.0
  - `@proteo/i18n-utils` to 1.3.5
  - `@proteo/date-utils` to 1.3.5
  - `@proteo/tag-manager` to 1.2.0
  - `@proteo/types` to 1.1.9

## 3.1.2 - 19/07/2024

### 3.1.2 Added

- Added the config objects for initializing the authorization utils
- Added the datamanager object in config for authentication apis

## 3.1.1 - 16/07/2024

### 3.1.1 Updated

- Updated `@proteo` packages to latest versions available
  - `@proteo/data-manager` to 2.0.11
  - `@proteo/ng-core` to 10.5.4

## 3.1.0 - 04/07/2024

### 3.1.0 Added

- Added folder `_templates`
  - Add `setup.js`: Script for use `mustache` render in all files inside in `_templates/files`

### 3.1.0 Updated

- Updated `tsconfig.app.json` replace `src/bootstrap-child.module.ts` to `src/bootstrap/bootstrap-child.module.ts`
- Updated commands `setup:local` and `setup:env`:
  - Now use `setup.js` for render `mustache` files
- Update `webpack.config.js` with new route of `bootstrap-child.module.ts`
  - Now `bootstrap-child.module.ts` and all files in `_templates/files/*` is generate dynamically in `src/bootstrap/*`
- Update `.gitignore` and now add `src/bootstrap/*`
  
### 3.1.0 Deleted

- Remove `setup/*`: Replace for `_templates`

## 3.0.0 - 01/07/2024

### 3.0.0 Added

- Added package `mustache`: Generating `bootstrap-child.module.ts` with different variables depending on execution scenario
- Added `setup` folder with:
  - Added `bootstrap-child.module.ts.template`: Template for generating `bootstrap-child.module.ts` in `src`
  - Added `env.json`: Use only in CDN deploy
  - Added `local.json`: Use in local development

### 3.0.0 Updated

- Updated `@proteo/ng-core` to `10.5.0`
- Updated `@proteo/data-manager` to `2.0.8`
- Updated `.gitignore`: add new rule, remove `src/bootstrap-child.module.ts`

### 3.0.0 Deleted

- Delete `bootstrap-child.module.ts` and now is generated in build ci steps or when starting project in local

## 2.6.0 - 01/07/2024

### 2.6.0 Added

- Added `tokens.json` in `local-conf` for token injection in local development
- Added `tokens.ts`: for declare `Angular tokens`
- Added the token injection in `app-component.ts`
- Added tags needed in `tsconfig.json` for token injection

### 2.6.0 Updated

- Updated dependencies:
  - "@proteo/cookie-utils": "^1.0.2"
  - "@proteo/data-manager": "^2.0.7"
  - "@proteo/date-utils": "^1.3.4"
  - "@proteo/event-bus": "^1.0.5"
  - "@proteo/feature-manager": "^1.1.5"
  - "@proteo/i18n-utils": "^1.3.4"
  - "@proteo/logger-utils": "^1.1.0"
  - "@proteo/ng-core": "~10.4.3"
  - "@proteo/object-utils": "^1.0.2"
  - "@proteo/tag-manager": "^1.1.7"
  - "@commitlint/cli": "^19.3.0"
  - "@proteo/commitlint-config": "^1.0.1"
  - "@proteo/eslint-config": "^1.1.2"
  - "@proteo/lint-staged-config": "^1.0.2"
  - "@proteo/prettier-config": "^1.0.1"
  - "@proteo/tsconfig": "^1.1.1"
  - "@proteo/types": "^1.1.5"
  - "prettier": "^3.2.2"

## 2.5.0 - 12/06/2024

### 2.5.0 - Added

- Added `manifest.json` in `local-conf` and in the `front-app-{{tagName}}-config` with dynamic routes
- Added `bs-language-selector` (Galatea Gamma Component) in `info-page.component.ts`
  - With this element we can change language.
- Added 2 new events to `BRIDGE_EVENTS` in all `env.json` files.
  - "BIOCATCH_READY"
  - "CONTEXT_CHANGED"

### 2.5.0 - Updated

- Updated `@proteo/ng-core` to `v10.2.0` and now use with `~`
  - This update remove internal call to FeatureManger inside DynamicRouting
  - Add more info for errors trying to load MFEs or Module Federated

### 2.5.0 - Removed

- Deleted property `dynamicRoutes` from `provideProteoBootstrap()`
- Deleted const `mockApplicationRemotes` from `bootstrap.ts`
  - Now `provideProteoBootstrap()` can load `manifest.json` as it does `env.json` or `runtime.json`
  - Now `DynamicRouting` use `manifest.json` for build routes
- Deleted `"FEATURE_MANAGER"`, inside "DYNAMIC_ROUTING" in **all** `env.json`
  - Now `FeatureManager` not use directly in `DynamicRouting`

## 2.4.0 - 27/05/2024

### 2.4.0 - Added

- Implemented i18n provider from `ng-core` in `bootstrap`
- Add example use `TranslatePipe` in `info-page.component.ts`
- Implemented i18n namespace for child mode in `bootstrap-child.module.ts`
  
### 2.4.0 - Updated

- @proteo/i18n-utils to v1.2.x
- @proteo/ng-core to v10.1.x
- @ngrx/store fixed to 17.2.0
- @ngrx/store-devtools fixed to 17.2.0
- @proteo/ng-core updated to 10.1.1
- Updated `bootstrap-child.ts` with providers

## 2.3.0 - 07/05/2024

### 2.3.0 - Updated

- Updated Angular version 17.3.6 and Added mock to dynamicRoutes bootstrap, modified prettierrc extension and fixed example routes

## 2.2.0 - 24/04/2024

### 2.2.0 - Updated

- Update tag manager config in mfe archetypes

## 2.1.0 - 25/03/2024

### 2.1.0 - Updated

- Add AxeCore and integration with Cypress e2e test

## 2.0.0 - 22/03/2024

### 2.0.0 - Updated

- Update Angular 16 to 17, and all dependencies.
- Update @proteo/ng-core to 10.0.0

## 1.3.3 - 20/03/2024

### 1.3.3 - Updated

- Fix: Removed BrowserModule and AppComponent imports from bootstrap-child.module.ts

## 1.3.2 - 01/03/2024

### 1.3.2 - Updated

- Fix: Disabled zoom from MFE Archetype

## 1.3.1 - 21/02/2024

### 1.3.1 - Updated

- Update bootstrap.ts now provideProteoBootstrap() integrate dynamic routing since @proteo/ng-core@9.1.0
- Update env files with dynamic routing config
- Update @proteo/ng-core to 9.1.0
- Update routes (now ROOT_PATH is '')

## 1.3.0 - 07/02/2024

### 1.3.0 - Updated

- Update bootstrap.ts now use provideProteoBootstrap() from @proteo/ng-core@9.0.0
- Update @proteo/ng-core to 9.0.0

### 1.3.0 - Fixed

- Update env files in app and conf projects with new config for CookiesUtils

## 1.2.0 - 07/02/2024

### 1.2.0 - Added

- Add package @proteo/feature-manager@1.0.2 (**only use in local for the moment**)
- Add Feature Manager and Dynamic Routing in bootstraping (**commented for the moment**)

### 1.2.0 - Updated

- Update version puppeteer to 21.6.1
- Update package @proteo/ng-core to 8.1.0 (with dynamic-routing utils)
- Update version cypress to 13.6.4 (not execute with npm run ci command for the moment, only use in local)

### 1.2.0 - Fixed

- Change environment.deploy.ts to use mustache
- Change local-conf/env.json to use mustache
- Add tagName variable to environment.deploy

## 1.1.5 - 04/1/2024

### 1.1.5 - Added

- Updated dependencies in package
- Added tests ci command for unit testing
- Updated local env.json and added local runtime.json

## 1.1.4 - 3/1/2024

### 1.1.4 - Added

- Changed Galatea Classic to Galatea Gamma
- Skipping ci testing stage due to the problems in the job

## 1.1.3 - 13/12/2023

### 1.1.3 - Added

- Added start-server-and-test dev dependency so test e2e can be run in the ci:test command
- Added cypress.json file for e2e tests

## 1.1.2 - 13/12/2023

### 1.1.2 - Added

- Added puppeteer dependency for testing into package devDependencies

## 1.1.1 - 24/11/2023

### 1.1.1 - Added

- Added helpers.scss and create scss forlder with all helpers styles files.
  
### 1.1.1 - Changed

- Updated angular.json assets added helper.scss

## 1.1.0 - 06/10/2023

### 1.1.0 - Added

- CHANGELOG.md.
- Added new proteo.config.json to track mfe-archetypes versioning.
- Implemented angular enviroments (develop, deploy).
- Added new index.deploy.html to load MFEs on deployed enviroments.
- Added bootstrap-child.module.ts to load MFE inside shell.
- Added first phase of ProteoStoreModule in angular boostraping.
- Added remote entry point in webpack.config.js.
- Federated rxjs and ngrx modules.
- Enabled webpack remote module config (module federation).
- Enabled routing in bootstraping child mode.

### 1.1.0 - Fixed

- Fixed title tag in index.html.

### 1.1.0 - Changed

- Updated default favicon.ico.
- Updated CONFIG_BASE_PATH param in proteo bootstraping.
- Updated galatea v9 to v11 CDN.

## 1.0.0 - 04/08/2023

### 1.0.0 -Added

- New archetype for new MFE with module federation and angular v16.
- Added proteo application bootstraping (@proteo/coreV2).
- Added @angular-architects/module-federation.
- Added @ngrx/store.
- Generated templates using mustache.
- Added documentation and demo with hexagonal architecture (info-page).
