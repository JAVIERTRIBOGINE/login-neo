# Mocks de back — PingAM y Citrix (NEO WS3)

Dos proyectos Spring Boot (Java 17) que simulan las respuestas de back necesarias
para probar el front (`front-app-login`) en local, sin depender de Apigee, PingAM
ni Citrix reales. Cubren únicamente las llamadas descritas en `CONTEXT.md`
(OAuth/OIDC) y `context-SAML.md` (SAML SP-Initiated).

No se simula Apigee: el front debe apuntar directamente a estos mocks.

## Requisitos

- Java 17+ (hay Java 25 instalado, es compatible)
- Maven (no está instalado — instalar con `brew install maven`, o usar `mvn` de tu IDE)

## Arrancar

```bash
cd mock-pingam && mvn spring-boot:run   # puerto 8081
cd mock-citrix && mvn spring-boot:run   # puerto 8082
```

## mock-pingam (puerto 8081) — IDP

| Endpoint | Método | Descripción |
|---|---|---|
| `/digital/party-authentication/v4/light-users/authenticate`<br>`/digital/party-authentication/v4/employees/authenticate` | POST | Árbol de autenticación simplificado: solo Caso 4 (NameCallback+PasswordCallback). Cualquier user/pass no vacíos son válidos. Devuelve `{authId, callbacks}` la 1ª vez, y `{successUrl, tokenId, realm}` + `Set-Cookie PA_SSO` la 2ª. |
| `/digital/party-authentication/v4/oauth2/authorize` | POST | Requiere cookie `PA_SSO` + `csrf` (=tokenId). Responde `302` a `redirectUri?code=...&state=...`. |
| `/digital/party-authentication/v4/oauth2/token` | POST | Intercambia `code` por `{access_token, id_token}` (JWT falsos, sin firma). Refresca `PA_SSO`. |
| `/SSORedirect` | GET | SSO endpoint SAML (llamada 3). Si `PA_SSO` es válida, devuelve HTML con form auto-enviado (`SAMLResponse`+`RelayState`) a la ACS URL de NEO. Si no, `401` HTML (sin form) — simula SSO Cookie inválida. |

**Casos 1-3 (Entra ID / Kerberos) NO se simulan todavía**. En la POC actual el mock salta directamente al Caso 4, devolviendo `NameCallback` + `PasswordCallback` en la primera llamada a `/authenticate`.

Pendiente para una simulación más fiel del árbol PingAM:

1. Primera llamada vacía a `/authenticate` → `RedirectCallback` (Entra ID).
2. Retorno/fallo simulado de Entra ID → continuación con `authId`.
3. POST con `{ authId }` → `HttpCallback` (Kerberos).
4. POST con `{ authId, callbacks }` + credenciales de navegador → fallo controlado `401`.
5. Caída final al formulario (`NameCallback` + `PasswordCallback`).

## mock-citrix (puerto 8082) — NetScaler/StoreFront

| Endpoint | Método | Descripción |
|---|---|---|
| `/resources` | GET | `200` + recursos si la cookie `NSC_TMAA` es válida; si no, `401` (dispara el flujo SAML). |
| `/authnRequest` | GET | Llamada 2. `302` hacia el `/SSORedirect` de mock-pingam con `SAMLRequest` (placeholder) + `RelayState`. |
| `/validateSAMLResponse` | POST (form) | Llamada 5. Decodifica el `SAMLResponse` (JSON en base64, no XML firmado real), valida `issuer`/`audience`/expiración, emite `Set-Cookie NSC_TMAA` y `302` a `return-url` (config). |

## Configuración (`application.yml` de cada proyecto)

- `mock.pingam.acs-neo-url` → ACS URL de NEO (`SamlResponseComponent`), por defecto `http://localhost:4500/saml/acs`.
- `mock.citrix.return-url` → ruta de retorno tras la llamada 5, por defecto `http://localhost:4500/saml/resources`.
- `mock.citrix.pingam-sso-url` → `http://localhost:8081/SSORedirect`.
- `mock.cors.allowed-origin` → origen del front, por defecto `http://localhost:4500`.

Ajustar estos valores y los de `front-app-login/src/environments/environment.ts`
(`endpoints.*` → `http://localhost:8081/...`, `saml.*` → `http://localhost:8082/...`)
para que el front local hable con los mocks.

Cuando el flujo se ejecuta desde la shell (`localhost:4300`), el proxy de `front-app-shell` reenvía `/digital` a `localhost:8081` y reescribe `Origin` a `http://localhost:4500`, porque el mock PingAM local acepta ese origen en CORS.

## Limitaciones del mock SAML

`SAMLRequest`/`SAMLResponse` son JSON en base64 (no XML firmado/cifrado real).
Sirven para probar el flujo de 6 llamadas, los redirects, los formularios
auto-enviados y las cookies — no para validar firmas SAML reales.
