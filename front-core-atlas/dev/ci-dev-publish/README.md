# ci-dev-publish — snapshot-publish.mjs

Script de publicación de dev snapshots para el monorepo `@proteo/core-monorepo`.

Publica versiones temporales (`x.y.z-dev.<timestamp>`) en un registro Verdaccio local
sin modificar permanentemente el semver real de los paquetes, permitiendo probarlos en
apps consumidoras sin alterar sus rangos de versión (`^1.0.0`).

---

## Requisitos

- **Node.js** >= 18
- **Verdaccio** corriendo en `http://localhost:4873`

Levanta Verdaccio con la configuración del repo:

```bash
pnpm run ci:dev:verdaccio
```

---

## Uso

```bash
# Modo normal: detecta automáticamente qué paquetes han cambiado
pnpm run ci:dev:publish

# Equivalente directo
node dev/ci-dev-publish/snapshot-publish.mjs

# Paquetes explícitos (sin detección automática)
node dev/ci-dev-publish/snapshot-publish.mjs @proteo/ng-legacy-loader @proteo/logger-utils

# Vista previa sin publicar
node dev/ci-dev-publish/snapshot-publish.mjs --dry-run

# Registry alternativo
node dev/ci-dev-publish/snapshot-publish.mjs --registry http://localhost:5000

# Modo watch: republica automáticamente al detectar cambios en ficheros
node dev/ci-dev-publish/snapshot-publish.mjs --watch

# Sync: publica todos los paquetes con su versión real, salta los que ya existen
node dev/ci-dev-publish/snapshot-publish.mjs --sync

# Sync de paquetes concretos con versión real
node dev/ci-dev-publish/snapshot-publish.mjs --sync @proteo/ng-legacy-loader @proteo/bridge
```

Los flags son combinables:

```bash
node dev/ci-dev-publish/snapshot-publish.mjs --dry-run --registry http://localhost:5000
node dev/ci-dev-publish/snapshot-publish.mjs --sync --dry-run
```

---

## Versión snapshot

La versión publicada tiene el formato:

```
{version_actual}-dev.{timestamp_ms}
```

Ejemplo: `2.0.0-dev.1773935926101`

- El timestamp es `Date.now()` en milisegundos.
- **Un único timestamp** se comparte para todos los paquetes de una misma ejecución, de forma que todas las snapshots del mismo batch son coherentes entre sí.
- Si la versión actual ya tiene pre-release o build metadata, se elimina antes de añadir el sufijo `dev` (ej: `1.0.0-beta.1` → `1.0.0-dev.<ts>`).
- **El `package.json` original no se modifica permanentemente.** El script parchea una copia en disco, publica y restaura el original en un bloque `finally`, garantizando la restauración incluso si se interrumpe con Ctrl+C.

---

## Detección de paquetes con cambios

El script combina dos fuentes para detectar qué paquetes publicar:

| Fuente                                                            | Comando                                                            | Qué detecta                         |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------- |
| Cambios commiteados en la rama actual pero no en `origin/develop` | `git merge-base HEAD origin/develop` + `git diff <base> HEAD --name-only` | Commits locales pendientes de merge |
| Cambios locales sin commitear                                     | `git status --porcelain`                                           | Staged + unstaged + untracked       |

Un paquete se marca como modificado si **cualquier fichero** dentro de su directorio aparece en alguna de las dos fuentes.

Los paquetes con `"private": true` se excluyen automáticamente.

---

## Plan de build y publicación

A partir de los paquetes semilla (los detectados por git o los pasados por CLI), el script calcula el grafo interno del workspace:

- **Dependientes recursivos** de los paquetes tocados: se publican porque consumen el cambio.
- **Dependencias internas recursivas** de ese lote: se publican con el mismo timestamp para que las referencias `workspace:*` queden alineadas en Verdaccio.

El build queda más acotado:

- Se ejecuta build de los paquetes semilla que tengan `scripts.build`.
- Se ejecuta build de cualquier paquete del lote cuyo artefacto publicable no exista todavía (`publishConfig.directory/package.json`).
- Los paquetes no tocados con artefacto ya generado se republican sin rebuild, para mantener el batch con versiones `dev` coherentes.

---

## Build y publicación con pnpm

El modo snapshot aplica temporalmente la versión `x.y.z-dev.<timestamp>` en los `package.json`
del lote de publicación, fuerza `publishConfig.registry` al registry elegido, ejecuta el build filtrado
solo para los paquetes necesarios y publica todo el lote con pnpm:

```bash
pnpm run -r --filter ./<ruta-pkg-con-build> --if-present build
pnpm publish -r --filter ./<ruta-pkg-del-lote> --tag dev --registry http://localhost:4873 --no-git-checks
```

El stdout/stderr de pnpm se transmite directamente al proceso padre, sin acumularse en memoria.
Los `--filter` repetidos son la forma de pasar a pnpm la lista de paquetes del lote. El script usa
filtros por ruta (`./src/...`) para evitar que pnpm seleccione también los `dist/package.json` con el
mismo `name`; el modo snapshot ejecuta un único `pnpm publish -r` para todo el batch.

---

## Paquetes Angular (`publishConfig.directory`)

Los paquetes Angular tienen `"publishConfig": { "directory": "dist" }`. El script parchea
temporalmente el `package.json` raíz antes del build; ng-packagr genera el `dist/package.json`
con la versión snapshot y `pnpm publish` publica desde `dist` respetando `publishConfig.directory`.

Esto garantiza que la versión snapshot aparece correctamente en el artefacto publicado.

---

## Dependencias cruzadas entre paquetes del monorepo

Si publicas varios paquetes a la vez y uno depende del otro, `pnpm publish -r` resuelve
automáticamente las referencias `workspace:*` usando las versiones snapshot parcheadas en
el workspace durante esa ejecución. Por eso el script publica el lote completo expandido por grafo,
no solo los paquetes tocados.

Ejemplo: si `@proteo/ng-legacy-loader` depende de `@proteo/logger-utils` y ambos se publican en la misma ejecución, pnpm publicará `ng-legacy-loader` apuntando a `logger-utils@x.y.z-dev.<ts>` en vez de a `workspace:*` o a la versión anterior.

---

## Build automático

Si un paquete semilla define el script `build`, el script lo ejecuta antes de publicar. Los paquetes
no tocados solo se buildean si falta su `package.json` publicable; si ya tienen artefacto, se
republican sin rebuild.

---

## Modo watch

Con `--watch`, el script observa todos los paquetes del workspace con `fs.watch`. Cuando detecta cambios en ficheros (ignorando `node_modules` y `package.json`), espera 500 ms de silencio y republica los paquetes afectados.

```bash
node dev/ci-dev-publish/snapshot-publish.mjs --watch
# [watch] Observando 68 paquete(s)... (Ctrl+C para salir)
```

---

## Seguridad ante interrupciones

El script registra handlers para `SIGINT` y `SIGTERM`. Si el proceso se interrumpe mientras un `package.json` está parcheado en disco, los handlers restauran todos los archivos modificados antes de salir.

Si la restauración falla (p.ej. disco lleno), se imprime un aviso con la ruta del archivo afectado para restauración manual.

---

## Output de ejemplo

```
Paquetes a publicar (2):
  @proteo/ng-legacy-loader  2.0.0 → 2.0.0-dev.1773935926101
  @proteo/logger-utils      1.2.1 → 1.2.1-dev.1773935926101

┌───────────────────────────────────────────────────────────────────┐
│                    📦 Snapshot Publish Results                    │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ✅ @proteo/ng-legacy-loader → 2.0.0-dev.1773935926101           │
│  ✅ @proteo/logger-utils     → 1.2.1-dev.1773935926101           │
│                                                                   │
├───────────────────────────────────────────────────────────────────┤
│  Versiones publicadas:                                            │
│                                                                   │
│  @proteo/ng-legacy-loader@2.0.0-dev.1773935926101                 │
│  @proteo/logger-utils@1.2.1-dev.1773935926101                     │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

Comandos copiables para actualizar en la app consumidora:
npm install @proteo/ng-legacy-loader@dev @proteo/logger-utils@dev --registry http://localhost:4873 --prefer-online --force --save-exact
```

---

## Actualizar la snapshot en una app consumidora

```bash
npm install @proteo/ng-legacy-loader@dev --registry http://localhost:4873 --prefer-online --force --save-exact
```

> `npm update` solo acepta nombres de paquete, no specs con dist-tag (`@dev`). Para consumir el último paquete publicado con el tag `dev`, usa `npm install <paquete>@dev` con `--prefer-online --force --save-exact`. `--save-exact` evita dejar rangos como `^x.y.z-dev.<timestamp>` en la app consumidora.

Si una app ya tiene rangos antiguos tipo `^x.y.z-dev.<timestamp>` guardados, restaura esos paquetes a su rango estable o añade ese paquete también como `<paquete>@dev` en el comando. npm intenta resolver todo lo que aparece en `package.json`, aunque no esté en la lista de paquetes que acabas de publicar.

O configurando el registry en el `.npmrc` del proyecto consumidor:

```ini
@proteo:registry=http://localhost:4873
```

---

## Modo `--sync`

Publica **todos** los paquetes del workspace con su versión real (la del `package.json`), sin generar versiones snapshot. Antes de publicar cada paquete consulta Verdaccio y lo salta si la versión ya existe.

Útil para inicializar Verdaccio con el estado actual del monorepo, o para forzar la publicación de versiones concretas sin modificar semver.

```
--sync
        │
        ├─ Todos los paquetes (o los pasados como argumento)
        │
        ├─ Por cada paquete (máx. 4 en paralelo):
        │     ├─ GET /<pkg>/<version> → ¿existe en Verdaccio?
        │     │     Sí → [skip]
        │     │     No → pnpm publish --registry http://localhost:4873
        │
        └─ Resumen: publicados / ya existían / fallidos
```

> En modo `--sync` **no** se modifica ningún `package.json` ni se genera versión snapshot.

---

## Flujo completo (modo normal / snapshot)

```
pnpm run ci:dev:publish
        │
        ├─ ¿Node >= 18?  No → exit 1
        │
        ├─ Lee pnpm-workspace.yaml → resuelve paquetes del workspace
        │
        ├─ ¿--sync?  → ver sección anterior
        │
        ├─ ¿Paquetes explícitos en args?
        │     Sí → usa esos
        │     No → detecta cambios:
        │            git merge-base HEAD origin/develop
        │          + git diff <base> HEAD --name-only
        │          + git status --porcelain
        │
        ├─ Sin paquetes → exit 0
        │
        ├─ Expande el grafo:
        │     ├─ paquetes tocados
        │     ├─ dependientes recursivos
        │     └─ dependencias internas recursivas del lote
        │
        ├─ Healthcheck Verdaccio (/-/ping)
        │     KO → exit 1 con instrucciones
        │
        ├─ Parchea package.json del lote con versión snapshot y registry Verdaccio
        │
        ├─ pnpm run -r --filter ./<ruta-pkg-con-build> --if-present build
        │
        ├─ pnpm publish -r --filter ./<ruta-pkg-del-lote> --tag dev --registry http://localhost:4873
        │     └─ pnpm resuelve automáticamente las dependencias workspace:*
        │
        ├─ Restaura package.json originales (bloque finally)
        │
        ├─ Imprime resumen con comandos de actualización
        │
        └─ exit 0 (todo ok) / exit 1 (algún fallo)
```

---

## Known-issues

### Mismo paquete, misma versión, código diferente — ¿cómo republicar?

**Escenario:**

1. El desarrollador A mergea a `develop`. El paquete `@proteo/package-a` pasa de `1.0.1` a `1.0.2` (changeset pendiente, aún **no publicado en Artifactory**).
2. Haces `git pull origin develop` y ejecutas `--sync`. Verdaccio queda con `@proteo/package-a@1.0.2` apuntando al primer código.
3. El desarrollador A detecta un error, cambia y vuelve a mergear a `develop`. Como el paquete **no llegó a liberarse en Artifactory**, el changeset sigue ahí y la versión del `package.json` se mantiene en `1.0.2`.
4. Haces `git pull origin develop`. Ahora tienes en local la `1.0.2` con el código nuevo, pero Verdaccio ya tiene la `1.0.2` con el código viejo — `--sync` la saltará porque considera que esa versión ya existe.

**Causa raíz:** `--sync` usa `GET /<pkg>/<version>` para decidir si publicar. Si la versión ya existe en Verdaccio, la omite sin comprobar si el código cambió.

---

**Solución paso a paso:**

**1. Asegúrate de tener el último estado de `develop`**

```bash
git pull origin develop
```

**2. Elimina la versión obsoleta de Verdaccio**

```bash
npm unpublish @proteo/package-a@1.0.2 --registry http://localhost:4873 --force
```

> Si no recuerdas el nombre exacto del paquete, comprueba cuáles están afectados comparando el diff:
>
> ```bash
> git diff HEAD~1 --name-only
> ```

**3. Republica el paquete con `--sync`**

```bash
node dev/ci-dev-publish/snapshot-publish.mjs --sync @proteo/package-a
```

Verdaccio ya no tiene esa versión, así que el script la publicará con el código nuevo.

**4. En la front-app — limpia la caché y actualiza**

```bash
# Limpia la caché de npm para evitar que sirva el artefacto stale
npm cache clean --force

# Actualiza el paquete concreto desde Verdaccio
npm update @proteo/package-a --registry http://localhost:4873
```

> Si usas pnpm en la front-app:
>
> ```bash
> pnpm store prune
> pnpm update @proteo/package-a --registry http://localhost:4873
> ```

**5. Verifica que tienes la versión correcta**

```bash
# npm
npm show @proteo/package-a version --registry http://localhost:4873

# o comprueba directamente en node_modules
cat node_modules/@proteo/package-a/package.json | grep '"version"'
```

Debería mostrar `1.0.2` y, si el paquete expone algún identificador de build, confirmar que corresponde al código nuevo.

---

**Resumen del flujo**

```
git pull origin develop
        │
        ├─ npm unpublish @proteo/package-a@1.0.2 --registry http://localhost:4873 --force
        │
        ├─ node dev/ci-dev-publish/snapshot-publish.mjs --sync @proteo/package-a
        │     └─ Verdaccio ya no tiene la versión → publica con el código nuevo
        │
        └─ front-app
              ├─ npm cache clean --force
              └─ npm update @proteo/package-a --registry http://localhost:4873
```

> **Alternativa sin `--sync`:** publica como snapshot (`node dev/ci-dev-publish/snapshot-publish.mjs @proteo/package-a`) y actualiza desde Verdaccio (`npm install @proteo/package-a@dev --registry http://localhost:4873 --prefer-online --force --save-exact`). Evita el conflicto de versiones porque genera una versión única `1.0.2-dev.<timestamp>`.

---

## Ficheros

```
dev/ci-dev-publish/
  snapshot-publish.mjs   ← Script principal
  README.md              ← Este archivo
dev/verdaccio/
  config.yml             ← Configuración de Verdaccio
  config.example.yml     ← Ejemplo sin credenciales
```
