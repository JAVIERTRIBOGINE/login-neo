# Proteo 4 Frontend Core

This project is a core toolkit for Proteo 4 architecture and its client apps.
It becomes with different utilities:

- [Proteo 4 Frontend Core](#proteo-4-frontend-core)
  - [Getting Started](#getting-started)
  - [Configurations](#configurations)
    - [Commit lint](#commit-lint)
    - [ESlint](#eslint)
    - [Jest](#jest)
    - [Lint staged](#lint-staged)
    - [Prettier](#prettier)
    - [Rollup](#rollup)
    - [tsconfig](#tsconfig)
  - [Core Utils](#core-utils)
    - [Decorators](#decorators)
      - [ProteoElement](#proteoelement)
      - [ProteoAtom](#proteoatom)
      - [ProteoMolecule](#proteomolecule)
      - [ProteoOrganism](#proteoorganism)
      - [ProteoTemplate](#proteotemplate)
      - [ProteoDestroy](#proteodestroy)
      - [ProteoUtils](#proteoutils)
    - [Amount Utils](#amount-utils)
    - [Currency Utils](#currency-utils)
    - [Platform Utils](#platform-utils)
    - [Date Utils](#date-utils)
    - [Logger](#logger)
    - [I18n](#i18n)
      - [Function t](#function-t)
      - [Function html (interpolation)](#function-html-interpolation)
      - [Function addNamespace](#function-addnamespace)
    - [HTTP (Data Manager)](#http-data-manager)
      - [Methods](#methods)
      - [Headers](#headers)
      - [TODO](#todo)

## Getting Started

This is a monorepo with all modules provided by Core Architecture Team. To contribute into the repo read [CONTRIBUTING](./CONTRIBUTING.md). Otherwise, if you want to use the library continue reading.

## Configurations

From Architecture Team we want to help you configuring your project and speed up your development. That why we provide the following configurations ready to use.

### Commit lint

We recommend to use the same pattern in your commit messages, for that we provide [@proteo/commitlint-config](./config/commitlint/) package with the recommended configuration for [commitlint](https://commitlint.js.org/). It validate if your commit message follow the [conventional commits](https://www.conventionalcommits.org/) rules.

```yaml .commitlintrc.yml
---
extends:
  - '@commitlint/config-conventional'
```

### ESlint

To ensure the code style is consistent we recomend use [eslint](https://eslint.org/) and we have a configuration you can use with the package [@proteo/eslint-config](./config/eslint/).

```json .eslintrc
{
  "extends": "@proteo"
}
```

### Jest

If you are using [jest](https://jestjs.io/) you can use [@proteo/jest-config](./config/jest/) to easy config your test environment by installing the package and adding a `jest.config.mjs` file:

```js
import { config } from '@proteo/jest-config';

export default config;
```

### Lint staged

With [lint-staged](https://github.com/okonet/lint-staged) you can just lint staged files instead of all project files. You can use [@proteo/lint-staged-config](./config/lint-staged/) to easy config by installing the package and adding a `lint-staged.config.js` file:

```js
import config from '@proteo/lint-staged-config';

export default config;
```

### Prettier

With [Prettier](https://prettier.io/) you con format your code. You can use [@proteo/prettier-config](./config/prettier/) to easy config by installing the package and adding a `.prettierrc.cjs` file:

```js
module.exports = require('@proteo/prettier-config');
```

### Rollup

With [Rollup](https://rollupjs.org/) you can bundle your code. You can use [@proteo/rollup-config](./config/rollup/) to easy config by installing the package and adding a `rollup.config.mjs` file:

```js
import { basicConfig } from '@proteo/rollup-config';

export default basicConfig();
```

### tsconfig

Installing the package [@proteo/tsconfig](./config/tsconfig/) you can apply the typescript rules in your project extending from this package. You have to configure the include and exclude files in addition to compiler Options.

```json
{
  "extends": "@proteo/tsconfig",
  "include": ["src/**/*.ts"],
  "exclude": ["src/test"],
  "compilerOptions": {
    "outDir": "./dist",
    "declarationDir": "./types",
    "rootDir": "./src"
  }
}
```

To learn more about this file see: https://www.typescriptlang.org/docs/handbook/tsconfig-json.html

## Core Utils

The library provides some utilities in order to develop a client app using the proteo 4 architecture

### Decorators

These are TypeScript decorators which extends the default class, method or property functionality

#### ProteoElement

Custom Method decorator to extends the proteo StencilJS WebComponents functionality, featuring its lifecycle.
It must be attached to the **componentWillLoad** lifecycle method

[Source Code](./src/utils/decorators/proteo-element.ts)

```ts
import { Component, Host, h } from '@stencil/core';
import { ProteoElement } from '@proteo/core';

@Component({
  tag: 'bs-hello-world',
  styleUrls: ['hello-world.scss', 'hello-world.theme.scss'],
  shadow: true
})
export class HelloWorld {
  @ProteoElement()
  componentWillLoad() {
    return null;
  }

  render() {
    return (
      <Host>
        <p>Proteo 4 Atom HELLO WORLD!</p>
        <slot></slot>
      </Host>
    );
  }
}
```

#### ProteoAtom

Custom Method decorator to extends the proteo StencilJS WebComponents Atoms functionality, featuring its lifecycle.
It must be attached to the **componentWillLoad** lifecycle method and above of [ProteoElement](#proteoelement)

[Source Code](./src/utils/decorators/proteo-atom.ts)

```ts
import { Component, Host, h } from '@stencil/core';
import { ProteoElement, ProteoAtom } from '@proteo/core';

@Component({
  tag: 'bs-hello-world',
  styleUrls: ['hello-world.scss', 'hello-world.theme.scss'],
  shadow: true
})
export class HelloWorld {
  @ProteoAtom()
  @ProteoElement()
  componentWillLoad() {
    return null;
  }

  render() {
    return (
      <Host>
        <p>Proteo 4 Atom HELLO WORLD!</p>
        <slot></slot>
      </Host>
    );
  }
}
```

#### ProteoMolecule

Custom Method decorator to extends the proteo StencilJS WebComponents Molecules functionality, featuring its lifecycle.
It must be attached to the **componentWillLoad** lifecycle method and above of [ProteoElement](#proteoelement)

[Source Code](./src/utils/decorators/proteo-molecule.ts)

```ts
import { Component, Host, h } from '@stencil/core';
import { ProteoElement, ProteoMolecule } from '@proteo/core';

@Component({
  tag: 'bs-hello-world',
  styleUrls: ['hello-world.scss', 'hello-world.theme.scss'],
  shadow: true
})
export class HelloWorld {
  @ProteoMolecule()
  @ProteoElement()
  componentWillLoad() {
    return null;
  }

  render() {
    return (
      <Host>
        <p>Proteo 4 Molecule HELLO WORLD!</p>
        <slot></slot>
      </Host>
    );
  }
}
```

#### ProteoOrganism

Custom Method decorator to extends the proteo StencilJS WebComponents Organisms functionality, featuring its lifecycle.
It must be attached to the **componentWillLoad** lifecycle method and above of [ProteoElement](#proteoelement)

[Source Code](./src/utils/decorators/proteo-organism.ts)

```ts
import { Component, Host, h } from '@stencil/core';
import { ProteoElement, ProteoOrganism } from '@proteo/core';

@Component({
  tag: 'bs-hello-world',
  styleUrls: ['hello-world.scss', 'hello-world.theme.scss'],
  shadow: true
})
export class HelloWorld {
  @ProteoOrganism()
  @ProteoElement()
  componentWillLoad() {
    return null;
  }

  render() {
    return (
      <Host>
        <p>Proteo 4 Organism HELLO WORLD!</p>
        <slot></slot>
      </Host>
    );
  }
}
```

#### ProteoTemplate

Custom Method decorator to extends the proteo StencilJS WebComponents Templates functionality, featuring its lifecycle.
It must be attached to the **componentWillLoad** lifecycle method and above of [ProteoElement](#proteoelement)

[Source Code](./src/utils/decorators/proteo-template.ts)

```ts
import { Component, Host, h } from '@stencil/core';
import { ProteoElement, ProteoTemplate } from '@proteo/core';

@Component({
  tag: 'bs-hello-world',
  styleUrls: ['hello-world.scss', 'hello-world.theme.scss'],
  shadow: true
})
export class HelloWorld {
  @ProteoTemplate()
  @ProteoElement()
  componentWillLoad() {
    return null;
  }

  render() {
    return (
      <Host>
        <p>Proteo 4 Template HELLO WORLD!</p>
        <slot></slot>
      </Host>
    );
  }
}
```

#### ProteoDestroy

Custom Method decorator to extends the proteo StencilJS WebComponents functionality, featuring its lifecycle.
It must be attached to the **disconnectedCallback** lifecycle method and it is used to destroy the Proteo 4 context for the WebComponent
[Source Code](./src/utils/decorators/proteo-destroy.ts)

```ts
import { Component, Host, h } from '@stencil/core';
import { ProteoDestroy } from '@proteo/core';

@Component({
  tag: 'bs-hello-world',
  styleUrls: ['hello-world.scss', 'hello-world.theme.scss'],
  shadow: true
})
export class HelloWorld {
  @ProteoDestroy()
  disconnectedCallback() {
    return null;
  }

  render() {
    return (
      <Host>
        <p>Proteo 4 Atom HELLO WORLD!</p>
        <slot></slot>
      </Host>
    );
  }
}
```

#### ProteoUtils

Custom Property decorator to extends the proteo Web Components functionality with a tool set (logger, i18n, analytics).
It must be attached to a WebComponent Property
[Source Code](./src/utils/decorators/proteo-component-utils.ts)

```ts
import { Component, Host, h } from '@stencil/core';
import { ProteoUtils, ProteoComponentUtils } from '@proteo/core';

@Component({
  tag: 'bs-hello-world',
  styleUrls: ['hello-world.scss', 'hello-world.theme.scss'],
  shadow: true
})
export class HelloWorld {
  @ProteoUtils() private proteoUtils: ProteoComponentUtils;

  render() {
    return (
      <Host>
        <p>Proteo 4 Atom HELLO WORLD!</p>
        <slot></slot>
      </Host>
    );
  }
}
```

### Amount Utils

Methods and enumerates for amount formatting and parsing. All these methods follows the bank recommendations for amount formatting and parsing. Below some examples:

```typescript
import { ProteoUtils, ProteoComponentUtils } from '@proteo/core';

@ProteoUtils() private proteoUtils: ProteoComponentUtils;

this.proteoUtils.amount.format(-1234.567); // '-1.234,567'
this.proteoUtils.amount.format(-12.49, { decimalDigits: 2 }); // '-12,49'
this.proteoUtils.amount.format(1000, { currency: 'EUR' }); // '1.000 €'
this.proteoUtils.amount.format(-12.49, { decimalDigits: 1, currency: 'EUR' }); // '-12,5 €'

this.proteoUtils.amount.parse('12,03'); // 12.03
this.proteoUtils.amount.parse('1,000.12', { language: 'en-GB' }); // 1000.12
```

### Currency Utils

Helpers for currencies. All these helpers follows the bank recommendations for currencies. Below some examples:

```typescript
import { ProteoUtils, ProteoComponentUtils } from '@proteo/core';

@ProteoUtils() private proteoUtils: ProteoComponentUtils;

this.proteoUtils.currency.getSymbol('EUR'); // '€'
this.proteoUtils.currency.getCode('&#8364'); // 'EUR'
```

### Platform Utils

Utilities for platform detection

```typescript
import { ProteoUtils, ProteoComponentUtils } from '@proteo/core';

@ProteoUtils() private proteoUtils: ProteoComponentUtils;

this.proteoUtils.platform.getPlatforms(); // ['mobile', 'ios']
```

### Date Utils

```typescript
import { ProteoUtils, ProteoComponentUtils } from '@proteo/core';

@ProteoUtils() private proteoUtils: ProteoComponentUtils;

this.proteoUtils.date.parse('01-01-1970', { format: 'dd-MM-yyyy' }) // Thu Jan 01 1970 00:00:00 GMT+0100 (Central European Standard Time)
this.proteoUtils.date.format(new Date(1970, 0, 1), { format: 'dd-MM-yyyy' }) // 01-01-1970
```

### Logger

```typescript
import { ProteoUtils, ProteoComponentUtils } from '@proteo/core';

@ProteoUtils() private proteoUtils: ProteoComponentUtils;

this.proteoUtils.logger.info('[hello-atom] message'); // 14:42:44 [proteo-logger] INFO: [hello-atom] message
this.proteoUtils.logger.info('[hello-atom] message', { message: 'message' }); // 14:42:44 [proteo-logger] INFO: [hello-atom] message [ { message: 'message' } ]
this.proteoUtils.logger.info(`[hello-atom] message ${JSON.stringify({ message: 'message' })}`); //14:42:44 [proteo-logger] INFO: [hello-atom] message {"message":"message"}

// Changing log level in runtime
document.dispatchEvent(new CustomEvent('EVENT-PROTEO-LOGGER-LEVEL-CHANGE', { detail: 'debug' })); // 18:22:28 [proteo-logger] DEBUG: [logger-utils] changed log level to <{"name":"DEBUG","action":"log","level":"debug"}>
```

### I18n

```typescript
import { ProteoUtils, ProteoComponentUtils } from '@proteo/core';

@ProteoUtils() private proteoUtils: ProteoComponentUtils;

this.proteoUtils.i18n.t('PROTEO4_COMMON:ACTIONS.ACCEPT'); // Language selected ca_ES ==> Acceptar
this.proteoUtils.i18n.html('PROTEO4_COMMON:VALIDATION.MIN_DATE', {
        minDate: '10/10/2009'
      }); // Language selected ca_ES ==> La data no pot ser inferior a: 10/10/2009
```

#### Function t

This function returns the string associated to the key passed how a property. The key is a pair of NAMESPACE followed with the key tree.
E.g: Namespace => , JSON tree => MYGROUP : { MYKEY: 'value'}

```typescript
const nameSpace = 'PROTEO4';
const jsonTreeLanguage = { MYGROUP: { MYKEY: 'value' } };

this.proteoUtils.i18n.t('PROTEO4:MYGROUP.MYKEY');
```

#### Function html (interpolation)

This function returns the string associated to the key passed how a property. But in this case, inject the content passed how a property into the value returned. The key is a pair of NAMESPACE followed with the key tree.
E.g: Namespace => PROTEO4, JSON tree => MYGROUP : { MYKEY: 'value {{replaceThis}}'}

```typescript
const nameSpace = 'PROTEO4';
const jsonTreeLanguage = { MYGROUP: { MYKEY: 'value {{replaceThis}}' } };

this.proteoUtils.i18n.t('PROTEO4:MYGROUP.MYKEY', { replaceThis: 'something' });
```

#### Function addNamespace

Proteo4 has an initial and common namespace to be used for the applications, but can be necessary to add some new namespace to support the project requirements. addNamespace adds a new namespace to be managed for the i18n library.
E.g: Namespace => MYPROJECT, LanguageMap : { es_ES: { MYGROUP : { MYKEY: 'value'} }}

```typescript
const nameSpace = 'MYPROJECT';
const languageMap = {
  es_ES: { MYGROUP: { MYKEY: 'value' } },
  ca_ES: { MYGROUP: { MYKEY: 'value' } }
};

this.proteoUtils.i18n.addNamespace(nameSpace, languageMap);
```

### HTTP (Data Manager)

Proteo4 Frontend architecture exposes an object into the `@ProteoUtils` component in order to perform http requests against the Proteo4 Middleware or other backends.

Some examples of making requests into the Proteo4 Middleware:

```typescript
import { DataManagerResponse, ProteoAtomAsync, ProteoComponentUtils, ProteoElementAsync, ProteoUtils } from '@proteo/core';

@ProteoUtils() private proteoUtils: ProteoComponentUtils;

@ProteoAtomAsync()
@ProteoElementAsync()
async componentWillLoad(): Promise<void> {
  const baseUrl = 'https://api.bancsabadell.com';
  let response: DataManagerResponse<User>;

  // SIMPLE REQUEST (one item)
  response = await this.proteoUtils.http.get(`${baseUrl}/users/1045`);
  this.proteoUtils.logger.info(`[${response.status}] user: ${JSON.stringify(response.data)}`);

  // > 18:14:17 [proteo-logger] INFO: [200] user: {"id":"1","name":"Balthasar","surname":"Ulloa"}

  // COMPLEX REQUEST (request + pagination)
  response = await this.proteoUtils.http.get(`${baseUrl}/users`);
  this.proteoUtils.logger.info(`[${response.status}] users: ${JSON.stringify(response.data)}`);

  // > 18:14:18 [proteo-logger] INFO: [200] users: [{"id":"1","name":"Balthasar","surname":"Ulloa"},{"id":"2","name":"Garoa","surname":"Guzmán"}]

  this.proteoUtils.logger.info(`[${response.status}] pagination: ${JSON.stringify(response.pagination)}`);

  // > 18:14:18 [proteo-logger] INFO: [200] pagination: {"offset":20,"limit":10,"page":3,"totalPages":7,"totalElements":65,"links":{"first":"https://api.bancsabadell.com/users?limit=10","prev":"https://api.bancsabadell.com/users?offset=10&limit=10","self":"https://api.bancsabadell.com/users?offset=20&limit=10","next":"https://api.bancsabadell.com/users?offset=30&limit=10","last":"https://api.bancsabadell.com/users?offset=60&limit=10"}}

  // EMPTY RESPONSE
  response = await this.proteoUtils.http.get(`${baseUrl}/empty`);
  this.proteoUtils.logger.info(`[${response.status}] empty: ${JSON.stringify(response.data)}`);

  // > 18:14:18 [proteo-logger] INFO: [201] empty: undefined

  // ERROR HANDLING
  try {
    await this.proteoUtils.http.get(`${baseUrl}/error`);
  } catch (error) {
    this.proteoUtils.logger.error(`[${error.status}] error: ${JSON.stringify(error.data)}`);

    // > 18:14:18 [proteo-logger] ERROR: [400] error: {"messages":[{"alias":"invalidParameters","message":"There are invalid parameters in the request.","type":"ERROR","params":[{"name":"username","message":"User name is not valid. Invalid character: '@'"}]}]}
  }
}

```

The data manager comes with some drivers to perform requests with middleware requirements wrapped into a driver to perform the final HTTP request. There is one example with the `Proteo4Driver`.

> Proteo Middleware documentation: [API DOCS](http://repos.bancsabadell.com/bitbucket/projects/PP4/repos/api-docs/browse/02.-%20dise%C3%B1o/Gu%C3%ADa%20de%20dise%C3%B1o.md)

#### Methods

The available HTTP methods for the Data Manager are the following

```typescript
const response: DataManagerResponse<User> = await this.proteoUtils.http.get(`${baseUrl}/user`);
const response: DataManagerResponse<User> = await this.proteoUtils.http.post(`${baseUrl}/user`, { body: 'body' });
const response: DataManagerResponse<User> = await this.proteoUtils.http.put(`${baseUrl}/user`, { body: 'body' });
const response: DataManagerResponse<User> = await this.proteoUtils.http.patch(`${baseUrl}/user`, { body: 'body' });
const response: DataManagerResponse<User> = await this.proteoUtils.http.delete(`${baseUrl}/user`);
const response: DataManagerResponse<User> = await this.proteoUtils.http.options(`${baseUrl}/user`);
const response: DataManagerResponse<User> = await this.proteoUtils.http.head(`${baseUrl}/user`);
```

#### Headers

In order to send custom request headers you could send this headers into the request method.

```typescript
const headers: Headers = new Headers({ 'my-header': 'header-value' });
const response: DataManagerResponse<User> = await this.proteoUtils.http.get(`${baseUrl}/user`, headers);
```

#### TODO

- [ ] **Authorization Headers**: `authorization` header [Authorization token OAuth or JWT BSSec to consume APIs], `x-auth` header [OIDC Token]
- [ ] **Content Type validation**: check response header
- [ ] **Global configuration**: implement data manager global configuration with environment properties (host, base path): <http://factory.bancsabadell.com/browse/EA-1725>
- [ ] **Interceptors**: implement custom interceptors: <http://factory.bancsabadell.com/browse/EA-1726>
- [ ] **Timeout**: implement request timeout with global configuration: <http://factory.bancsabadell.com/browse/EA-1727>
