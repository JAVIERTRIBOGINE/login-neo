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
| `/digital/party-authentication/v4/light-users/authenticate`<br>`/digital/party-authentication/v4/employees/authenticate` | POST | Árbol de autenticación POC: 1ª llamada devuelve `RedirectCallback`; la reanudación con `authId` simula internamente error Entra ID + fallo Kerberos ADGBS.com/Atenea y devuelve `200 OK` con `NameCallback`+`PasswordCallback`; el POST con credenciales mock válidas devuelve `{successUrl, tokenId, realm}` + `Set-Cookie PA_SSO`. |
| `/digital/party-authentication/v4/oauth2/authorize` | POST | Requiere cookie `PA_SSO` + `csrf` (=tokenId). Responde `302` a `redirectUri?code=...&state=...`. |
| `/digital/party-authentication/v4/oauth2/token` | POST | Intercambia `code` por `{access_token, id_token}` (JWT falsos, sin firma). Refresca `PA_SSO`. |
| `/SSORedirect` | GET | SSO endpoint SAML (llamada 3). Si `PA_SSO` es válida, devuelve HTML con form auto-enviado (`SAMLResponse`+`RelayState`) a la ACS URL de NEO. Si no, redirige a `/login?samlSso=unauthorized` en la Shell para registrar el rechazo e iniciar el fallback OAuth. |

Respuesta exacta del fallback local cuando no existe una SSO Cookie activa:

```http
HTTP/1.1 303 See Other
Location: http://localhost:4300/login?samlSso=unauthorized
```

Esta URL es parte del contrato con PingAM/Apigee: en otros entornos debe sustituirse el host local, pero conservar una ruta resoluble por la Shell y el indicador funcional acordado.

El mock simula Entra ID y Kerberos como lógica interna de PingAM: no expone
`HttpCallback` al front ni devuelve `401` para caer a credenciales. La caída se
modela como respuesta funcional:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{ "authId": "...", "callbacks": [NameCallback, PasswordCallback] }
```

Secuencia POC del árbol:

1. Primera llamada vacía a `/authenticate` → `RedirectCallback` (Entra ID).
2. El front local reanuda con `{ authId }` para simular la vuelta de Entra ID.
3. PingAM mock simula internamente: Entra ID error → Kerberos ADGBS.com error → Kerberos Atenea error.
4. PingAM mock devuelve `200 OK` con `NameCallback` + `PasswordCallback`.
5. POST con `{ authId, callbacks }` rellenando `IDToken1`/`IDToken2` → `{successUrl, tokenId, realm}` + `Set-Cookie PA_SSO`.

## mock-citrix (puerto 8082) — NetScaler/StoreFront

| Endpoint | Método | Descripción |
|---|---|---|
| `/resources` | GET | `200` + recursos si la cookie `NSC_TMAA` es válida; si no, `401` (dispara el flujo SAML). |
| `/authnRequest` | GET | Llamada 2. `302` hacia el `/SSORedirect` de mock-pingam con `SAMLRequest` (placeholder) + `RelayState`. |
| `/validateSAMLResponse` | POST (form) | Llamada 5. Decodifica el `SAMLResponse` (JSON en base64, no XML firmado real), valida `issuer`/`audience`/expiración, emite `Set-Cookie NSC_TMAA` y `302` a `return-url` (config). |

## Configuración (`application.yml` de cada proyecto)

- `mock.pingam.acs-neo-url` → adaptador HTTP receptor del Form POST, por defecto `http://localhost:8081/saml/acs`.
- `mock.pingam.neo-acs-return-url` → ACS Angular en la Shell, por defecto `http://localhost:4300/saml/acs`.
- `mock.pingam.neo-login-url` → fallback SSO → OAuth, por defecto `http://localhost:4300/login?samlSso=unauthorized`.
- `mock.citrix.return-url` → ruta de retorno tras la llamada 5, por defecto `http://localhost:4300/saml/resources`.
- `mock.citrix.pingam-sso-url` → `http://localhost:8081/SSORedirect`.
- `mock.cors.allowed-origins` → orígenes permitidos, por defecto `http://localhost:4300,http://localhost:4500`.

Ajustar estos valores y los de `front-app-login/src/environments/environment.ts`
(`endpoints.*` → `http://localhost:8081/...`, `saml.*` → `http://localhost:8082/...`)
para que el front local hable con los mocks.

Cuando el flujo se ejecuta desde la shell (`localhost:4300`), el proxy de `front-app-shell` reenvía `/digital` a `localhost:8081` y reescribe `Origin` a `http://localhost:4500`, porque el mock PingAM local acepta ese origen en CORS.

## Limitaciones del mock SAML

`SAMLRequest`/`SAMLResponse` son JSON en base64 (no XML firmado/cifrado real).
Sirven para probar el flujo de 6 llamadas, los redirects, los formularios
auto-enviados y las cookies — no para validar firmas SAML reales.
