# Data Manager

Data Manager is a wrapper tool to manage Data drivers. You can configure as many Drivers that you need.

## Initialize

You can `initialize` one or more driver at once.

```js
import { initialize } from '@proteo/data-manager';

initialize({
  DEFAULT: {
    HOST: 'https://api.host.com',
    BASE_PATH: '/v1/',
    DRIVER: 'P4' //default value
  }
});
```

## Has driver

You can check if a driver exists with `hasDriver`:

```js
import { hasDriver } from '@proteo/data-manager';

const driverExist = hasDriver('MY-DRIVER-NAME');
```

## Get driver

You can get a driver calling `getDriver` with the name of the desired driver

```js
import { getDriver } from '@proteo/data-manager';

const myDriver = getDriver('MY-DRIVER-NAME');
```

## Delete driver

You can delete a driver with `deleteDriver`:

```js
import { hasDriver } from '@proteo/data-manager';

deleteDriver('MY-DRIVER-NAME');
```

## Delete all drivers

You can delete all drivers with `deleteAllDriver`:

```js
import { hasDriver } from '@proteo/data-manager';

deleteAllDriver();
```

## Set authorization

You can set same tokens to all drivers using `setAuthorization`.

```js
import { setAuthorization } from '@proteo/data-manager';

const tokens: AuthorizationTokens = { OAUTH: 'token', OIDC: 'token' };

setAuthorization(tokens);
```

Other wise, if you want to set tokens to specific Driver, you can get it and call `setAuthorization`.

## Clear tokens

You can remove tokens to all drivers using `clearTokens`.

```js
import { clearTokens } from '@proteo/data-manager';

clearTokens();
```

Other wise, if you want to set tokens to specific Driver, you can get it and call `clearTokens`.
