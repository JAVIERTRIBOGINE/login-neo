# Front Core Atlas en local con Verdaccio

Guia rapida para publicar snapshots locales de `front-core-atlas` y consumirlos desde `front-app-login`.

## Objetivo

- Levantar un registry local Verdaccio en `http://localhost:4873`.
- Publicar paquetes `@proteo/*` desde `front-core-atlas` con version snapshot `x.y.z-dev.<timestamp>`.
- Instalar esas versiones en `front-app-login` usando el dist-tag `@dev`.

No hace falta cambiar `angular.json` del micro para consumir los paquetes locales. El punto importante es el registry de npm y las versiones del `package.json`.

## 1. Preparar Verdaccio

En `front-core-atlas/dev/verdaccio/config.yml` debe existir un uplink a Artifactory.

Ejemplo, sin copiar secretos al repo:

```yaml
uplinks:
  artifactory-sabadell:
    url: https://artifactory.apps.devops.aws.bancsabadell.com/artifactory/api/npm/npm-virtual/
    cache: true
    strict_ssl: false
    auth:
      type: bearer
      token: '<ARTIFACTORY_TOKEN>'
```

El token correcto es el identity token de Artifactory, no el `Token ID` visible en la tabla.

## 2. Terminal 1: levantar Verdaccio

Desde la raiz de `front-core-atlas`:

```bash
pnpm run ci:dev:verdaccio
```

Dejar esta terminal abierta. Verdaccio queda escuchando en:

```text
http://localhost:4873
```

## 3. Terminal 2: publicar snapshots de Atlas

Desde la raiz de `front-core-atlas`:

```bash
pnpm run ci:dev:publish
```

El script:

- detecta paquetes modificados y paquetes relacionados;
- ejecuta los builds necesarios;
- publica versiones `*-dev.<timestamp>` en Verdaccio;
- reescribe dependencias internas `workspace:*` a versiones reales durante la publicacion.

Al final debe aparecer un bloque parecido a:

```text
Versiones publicadas:
  @proteo/ng-bootstrap@3.1.6-dev.1781195668306
  @proteo/ng-routing@3.7.6-dev.1781195668306
  ...
```

Para publicar paquetes concretos:

```bash
node dev/ci-dev-publish/snapshot-publish.mjs @proteo/ng-bootstrap @proteo/ng-routing
```

Para comprobar una version publicada:

```bash
npm view @proteo/ng-bootstrap@dev version --registry http://localhost:4873
```

## 4. Configurar front-app-login para usar Verdaccio

En `front-app-login/.npmrc`:

```ini
registry=https://artifactory.apps.devops.aws.bancsabadell.com/artifactory/api/npm/npm-virtual/
//artifactory.apps.devops.aws.bancsabadell.com/artifactory/api/npm/npm-virtual/:_authToken=<ARTIFACTORY_TOKEN>

@proteo:registry=http://localhost:4873
```

Con esto:

- los paquetes `@proteo/*` se buscan primero en Verdaccio;
- Verdaccio proxya a Artifactory cuando el paquete/version no existe localmente;
- el resto de paquetes npm siguen saliendo por Artifactory.

## 5. Instalar snapshots en front-app-login

Desde la raiz de `front-app-login`, instalar los paquetes `@proteo` que quieres traer desde Atlas usando `@dev`:

```bash
npm install \
  @proteo/authorization-utils@dev \
  @proteo/cookie-utils@dev \
  @proteo/data-manager@dev \
  @proteo/date-utils@dev \
  @proteo/event-bus@dev \
  @proteo/feature-manager@dev \
  @proteo/i18n-utils@dev \
  @proteo/logger-utils@dev \
  @proteo/ng-bootstrap@dev \
  @proteo/ng-legacy-loader@dev \
  @proteo/ng-routing@dev \
  @proteo/ng-store@dev \
  @proteo/ng-translate@dev \
  @proteo/object-utils@dev \
  @proteo/platform@dev \
  @proteo/storage-utils@dev \
  @proteo/tag-manager@dev \
  @proteo/validation-utils@dev \
  --registry http://localhost:4873 \
  --prefer-online \
  --force \
  --save-exact
```

Notas:

- `npm install <paquete>@dev` resuelve la ultima snapshot publicada con dist-tag `dev`.
- `--save-exact` evita que `package.json` guarde rangos tipo `^1.0.0-dev.<timestamp>`.
- `npm update` no sirve para `@dev`; usa `npm install`.
- Si sale `No matching version found for @proteo/xxx@dev`, ese paquete no se publico en Verdaccio. Publicalo desde Atlas o vuelve temporalmente a una version estable.

Despues de instalar:

```bash
npm run build
```

## 6. Arrancar front-app-login

Con Verdaccio y los mocks levantados, desde `front-app-login`:

```bash
npm run start
```

URL:

```text
http://localhost:4500
```

## 7. Flujo habitual cuando cambias Atlas

1. Mantener Verdaccio levantado:

   ```bash
   pnpm run ci:dev:verdaccio
   ```

2. Publicar nueva snapshot desde `front-core-atlas`:

   ```bash
   pnpm run ci:dev:publish
   ```

3. Actualizar el micro desde `front-app-login`:

   ```bash
   npm install @proteo/ng-bootstrap@dev @proteo/ng-routing@dev --registry http://localhost:4873 --prefer-online --force --save-exact
   ```

4. Si quieres actualizar todos los paquetes runtime `@proteo`, usa el comando largo de la seccion 5.

5. Levantar o recompilar el micro:

   ```bash
   npm run build
   npm run start
   ```

## 8. Errores comunes

### `E401 Incorrect or missing password`

Normalmente significa que npm esta intentando ir a npmjs/Artifactory con credenciales incorrectas, o que el token de Artifactory no esta configurado.

Revisar:

- `front-app-login/.npmrc`;
- `front-core-atlas/dev/verdaccio/config.yml`;
- que `@proteo:registry=http://localhost:4873` este en el micro.

### `EUNSUPPORTEDPROTOCOL Unsupported URL Type "workspace:": workspace:*`

Significa que se publico un paquete con dependencias `workspace:*` sin resolver. El script `pnpm run ci:dev:publish` debe resolverlas antes de publicar.

Si reaparece:

```bash
pnpm run ci:dev:publish
```

y reinstala en el micro con `@dev`.

### `No matching version found for @proteo/xxx@dev`

Ese paquete no tiene snapshot con dist-tag `dev` en Verdaccio.

Comprobar:

```bash
npm view @proteo/xxx@dev version --registry http://localhost:4873
```

Si no existe, publica el paquete desde `front-core-atlas`.

### Verdaccio no responde

Comprobar que la Terminal 1 sigue abierta y que `http://localhost:4873` esta levantado.

## 9. Limpieza opcional

Para volver el micro a versiones estables, restaura las versiones de `@proteo/*` en `front-app-login/package.json` y reinstala:

```bash
npm install
```

No borres `dev/verdaccio/storage` salvo que quieras perder el cache y todas las snapshots locales publicadas.
