# CONTEXT.md — Proyecto Login / NEO WS3

Este documento recoge el contexto arquitectónico y de diseño técnico acumulado para el desarrollo del flujo de autenticación OAuth+SAML de NEO (WS3 - parte front). Sirve como referencia para Claude Code y para cualquier desarrollador que se incorpore al proyecto.

---

## 1. Contexto global del proyecto

### Solución: NEO
Portal financiero interno de Banc Sabadell para gestores (empleados). Reemplaza al portal anterior con tecnologías modernas (MicroFrontends, Angular, HTML5).

**Work Streams relevantes:**
- **WS3** — Servicio de autenticación/autorización (este proyecto)
- **WS2** — Servicio de streaming (HDX/ICA sobre HTML5)

### Documento de referencia base
**[DA] SSO P4 con Storefront Web API** — Diseño de Arquitectura validado por todas las partes implicadas (v1.0, 30/04/2026). Este proyecto es la implementación front del DA.

---

## 2. Stack tecnológico de autenticación (visión global)

### Plano de Acceso
```
Apigee (API Gateway)
    └── PingAM / ForgeRock AM — desplegado en Kubernetes (EKS)
        ├── Entornos: INT, PRE, PRO (segregados)
        └── Expuesto vía Apigee por entorno
```

### Plano de Identidad
```
ADGBS.com (Active Directory — fuente de verdad del UPN)
    ├── Kerberos KDCs (dominio ADGBS.com y dominio Atenea)
    └── LDAP RACF (identidades reconciliadas vía ISIM desde AD)
```

### Árbol de autenticación PingAM (POST /authenticate)
Orden de evaluación — los tres primeros son transparentes al usuario:
1. **Federación OIDC con Entra ID** — Authorization Code Flow, scope: `openid`, usa `sub` para búsqueda local
2. **Kerberos — dominio ADGBS.com**
3. **Kerberos — dominio Atenea**
4. **Usuario + contraseña** — único paso visible, solo si fallan los anteriores (continuidad de negocio)

### Stack Citrix (Customer Managed DataCenter)
```
Citrix ADC / NetScaler (SP SAML — Virtual Server NEO)
    └── StoreFront (entrega de recursos autenticados)
        └── Delivery Controller
            └── FAS (Federated Authentication Service)
                └── VDA → Eclipse Lite (Terminal Financiero)
                    └── HTML5 / HDX encapsulado sobre WSS/SSE
```

**FAS** transforma la identidad federada (SAML) en un certificado temporal de logon Windows, permitiendo abrir sesión en el VDA sin contraseña.

**UPN** (del AD) es el identificador requerido por FAS — el `saml:subject` debe contener el UPN del usuario.

---

## 3. Flujo combinado SAML + OAuth/OIDC

Esta sección es la referencia de auditoría del flujo real que debe cumplir el front.
El flujo arranca intentando recuperar sesión Citrix por SAML; si PingAM no encuentra
SSO Cookie, el navegador vuelve a Angular y se inicia OAuth/OIDC para generar la SSO
Cookie. Al terminar OAuth, Angular continúa el SAML pendiente hacia PingAM/ACS
para validar `SAMLResponse`; solo después del `302` de NetScaler vuelve a
`/saml/resources`.

### 3.1 Entrada SAML y fallback hacia OAuth

**Objetivo:** intentar recuperar sesión Citrix por SAML. Si no hay sesión Citrix,
NetScaler inicia SAML SP-Initiated; si PingAM no encuentra SSO Cookie activa,
devuelve el navegador al Login MFE para reconstruir sesión OAuth.

| Punto | De -> A | Tipo de llamada | Status y respuesta | Resultado en front |
|---:|---|---|---|---|
| S1 | Angular `ResourcesComponent` -> NetScaler/StoreFront | XHR `HttpClient` con `withCredentials` | `GET /resources`. Si no hay Citrix Session Cookie: `401 Unauthorized`. | `SamlManagerService` publica `AUTHN_REQUEST`; Angular navega a `/saml/authorization-request`. |
| S2 | Angular `GetAuthorizationRequestComponent` -> NetScaler | Navegación de navegador: `window.location` si `GET`, formulario si `POST`; no es XHR | `GET /authnRequest` (o `POST`, si Citrix lo configura así). Respuesta esperada: `302 Found` + `Location: <PingAM SSO>?SAMLRequest=...&RelayState=...`. | Angular abandona contexto. El navegador toma el control. |
| S3 | Navegador -> PingAM | Navegación automática siguiendo el `302` de NetScaler | `GET /SSORedirect?SAMLRequest=...&RelayState=...` con SSO Cookie si existe. | PingAM comprueba SSO Cookie. Angular no interviene. |
| S4 | PingAM -> Navegador | Redirect HTTP por SSO Cookie ausente/expirada | `303 See Other` + `Location: /login?samlSso=unauthorized`. | El navegador sigue el `Location`; Angular no recibe el 303 como XHR. |
| S5 | Navegador -> NEO Angular | Navegación del navegador | `GET /login?samlSso=unauthorized` -> HTML/app Angular. | `LoginComponent` lee `samlSso=unauthorized` e inicia OAuth. |

**Continuación:** desde S5 empieza la parte OAuth/OIDC del apartado 3.2.

### 3.2 OAuth/OIDC - árbol de autenticación PingAM

**Objetivo:** obtener `tokenId`, establecer SSO Cookie en el navegador y continuar
hasta `access_token` + `id_token`.

| Punto | De -> A | Tipo de llamada | Status y respuesta | Resultado en front |
|---:|---|---|---|---|
| 4 | Angular `LoginComponent` -> PingAM | XHR (`AuthManagerService.makeDriverCall`; DataManager o `HttpClient/fetch`) | `POST /employees/party-authentication/v1/authentication` con body `{}`. Respuesta `200 OK` JSON `{ authId, callbacks: [RedirectCallback] }`. | `AuthManager` guarda `authId` y usa `RedirectCallback.output.redirectUrl`. |
| 5 | Angular/Navegador -> Entra ID/PingAM | Formulario `GET` autoenviado; no es XHR | Angular crea form con los datos de `redirectUrl`. El navegador sale del contexto Angular hacia Entra ID/PingAM. | Angular abandona contexto temporalmente. |
| 6 | Entra ID -> PingAM | Redirect/error federado | Entra ID falla y vuelve al `redirect_uri` de PingAM con `error`, `error_description`, `state` o equivalente. | Angular no recibe este error. |
| 7 | PingAM | Evaluación interna del árbol | PingAM consume el error de Entra ID y decide probar autenticación transparente. | Angular no interviene. |
| 7.1 | PingAM -> Kerberos ADGBS.com | Validación interna Kerberos/SPNEGO | Sin HTTP front. Resultado esperado en este escenario: fallo por ausencia de ticket válido o validación rechazada. | El fallo no se expone al navegador. |
| 7.2 | PingAM -> Kerberos Atenea | Validación interna Kerberos/SPNEGO | Sin HTTP front. Resultado esperado en este escenario: fallo por ausencia de ticket válido o validación rechazada. | El fallo no se expone al navegador. |
| 7.3 | Kerberos/SPNEGO -> PingAM | Error interno GSS/Kerberos | No es JSON front. PingAM detecta error SPNEGO/Kerberos (`GSSException` o `KRB-ERROR`) y decide caer a credenciales. | Angular sigue sin intervenir. |
| 8 | PingAM -> Navegador -> Angular | Redirect de navegador | PingAM redirige a Angular: `303 See Other` / `Location: /login?authId=...`. | El navegador devuelve control a `LoginComponent`. |
| 9 | Angular `LoginComponent` -> PingAM | XHR de reanudación | `POST /authentication` con body `{ authId }`. Respuesta `200 OK` JSON `{ authId, callbacks: [NameCallback, PasswordCallback] }`. | Angular publica `REDIRECT_CREDENTIALS` y pinta formulario usuario/password. |
| 10 | Usuario -> Angular | Interacción UI | Sin HTTP | Usuario introduce credenciales en `LoginComponent`. |
| 11 | Angular -> PingAM | XHR (`AuthManagerService.submitCredentials`) | `POST /authentication` con `{ authId, callbacks: [NameCallback, PasswordCallback] }` rellenados. | PingAM valida usuario/password. |
| 12 | PingAM -> Angular/navegador | Respuesta XHR con cookie | `200 OK` JSON `{ successUrl, tokenId, realm }` + `Set-Cookie` SSO HttpOnly. | `AuthManager` publica `AUTH_SUCCESS`; `LoginComponent` navega a `/authorize`. |
| 13 | Angular/Navegador -> PingAM | Formulario POST autoenviado; no es XHR | `POST /oauth2/authorize` con params OAuth y `csrf/assertion=tokenId`. Respuesta esperada: `302 Found` + `Location: /token?code=...&state=...`. | El navegador sigue el redirect y carga `GetTokensComponent`. |
| 14 | Angular `GetTokensComponent` -> PingAM | XHR/DataManager o `fetch` local | `POST /oauth2/token`. Esperado: `200 OK` JSON `{ access_token, id_token }` + refresh de SSO Cookie si aplica. | Angular guarda tokens en Data Manager. |
| 15 | Angular/Navegador -> NetScaler | Navegación de navegador; no es XHR | `GET /authnRequest` o `POST /authnRequest` según configuración. NetScaler responde `302 Found` + `Location: <PingAM SSO>?SAMLRequest=...&RelayState=...`. | Se continúa SAML para obtener `SAMLResponse`; no se llama aún a `/resources`. |

**Punto crítico de auditoría:** el front debe distinguir tres llamadas
`/authenticate`: inicio `{}`, reanudación `{ authId }` y credenciales
rellenadas `{ authId, callbacks }`. Entra ID y Kerberos no se exponen como XHR
Angular; se representan mediante navegación del navegador y retorno a
`/login?authId=...`.

### 3.3 Reentrada SAML tras OAuth y validación de SAMLResponse

**Objetivo:** una vez creada la SSO Cookie de PingAM y obtenidos los tokens OAuth,
Angular vuelve a SAML. Esta segunda vuelta ya no debe caer a OAuth: PingAM debe
emitir una `SAMLResponse`, NetScaler debe validarla en `/validateSAMLResponse`,
crear la Citrix Session Cookie y devolver el navegador a `/saml/resources`.

| Punto | De -> A | Tipo de llamada | Status y respuesta | Resultado en front |
|---:|---|---|---|---|
| S6 | Angular/Navegador -> NetScaler | Navegación post-token a AuthnRequest; no es XHR | `GET /authnRequest` o `POST /authnRequest` según configuración. NetScaler genera `SAMLRequest` + `RelayState` y responde `302 Found` a PingAM. | Angular abandona contexto. El navegador toma el control. |
| S7 | Navegador -> PingAM | Navegación siguiendo el `302` de NetScaler | `GET /SSORedirect?SAMLRequest=...&RelayState=...` con SSO Cookie activa. PingAM responde `200 OK text/html` con formulario autoenviado. | PingAM construye `SAMLResponse` y `RelayState`. Angular no llama a `/resources` en este punto. |
| S8 | Navegador -> ACS NEO | Formulario autoenviado por PingAM | Real: `POST <ACS URL NEO>` con `SAMLResponse` + `RelayState`. Local: `POST http://localhost:8081/saml/acs` -> `303 See Other` a `/saml/acs?responseId=...`. | El navegador carga la ruta ACS de Angular. En local, el payload se recupera por `responseId`. |
| S9 | Angular `ACSComponent` -> adaptador ACS local | XHR `HttpClient` con `withCredentials` | Local: `GET /saml/acs-response/{responseId}` -> `200 OK` JSON `{ samlResponse, relayState }`. | Angular recupera `SAMLResponse` + `RelayState` y prepara el formulario hacia NetScaler. |
| S10 | Navegador -> NetScaler | Formulario autoenviado por Angular; no es XHR | `POST /validateSAMLResponse` con `Content-Type: application/x-www-form-urlencoded`, body `SAMLResponse=<base64>&RelayState=<relay>`. Éxito: `302 Found` + `Set-Cookie: <Citrix Session Cookie>` + `Location: /saml/resources`. Error: `400 Bad Request` o `401 Unauthorized`. | NetScaler valida la aserción SAML y crea la sesión Citrix. Angular abandona contexto durante el POST. |
| S11 | Navegador -> NEO Angular -> NetScaler/StoreFront | Navegación de navegador y XHR posterior con `withCredentials` | `GET /saml/resources` carga Angular; `ResourcesComponent` ejecuta `GET /resources` -> `200 OK` con recursos. | `SamlManagerService` publica `SAML_SUCCESS`; `AuthManager` completa autorización SAML. |

**Punto crítico de auditoría SAML:** `/validateSAMLResponse` es validación de
NetScaler, no validación de Angular. Angular solo transporta la `SAMLResponse`
en un formulario autoenviado; el éxito real se confirma después, cuando el
redirect vuelve a `/saml/resources` y `GET /resources` responde `200 OK`.

### 3.4 Objetos relevantes del contrato OAuth/SAML

#### Punto 4 - inicio de árbol

```typescript
POST /employees/party-authentication/v1/authentication
Content-Type: application/json

{}
```

Respuesta:

```typescript
{
  authId: "eyJhbGci...",
  callbacks: [
    {
      type: "RedirectCallback",
      output: [
        { name: "redirectUrl", value: "https://.../authorize?...&state=..." },
        { name: "redirectMethod", value: "GET" }
      ],
      input: [{ name: "IDToken1", value: "" }]
    }
  ]
}
```

#### Punto 5 - salida por RedirectCallback

Angular no enriquece el callback. Extrae `output.redirectUrl`, crea un
formulario `GET` y el navegador abandona temporalmente Angular hacia
Entra ID/PingAM.

#### Punto 6 - vuelta a Angular con authId

Tras fallar Entra ID y Kerberos, PingAM devuelve el control al navegador:

```http
303 See Other
Location: /login?authId=...
```

Angular lee `authId` y reanuda:

```typescript
POST /employees/party-authentication/v1/authentication
Content-Type: application/json

{ authId: "eyJhbGci..." }
```

Respuesta:

```typescript
{
  authId: "eyJhbGci...",
  callbacks: [
    {
      type: "NameCallback",
      output: [{ name: "prompt", value: "User Name" }],
      input: [{ name: "IDToken1", value: "" }]
    },
    {
      type: "PasswordCallback",
      output: [{ name: "prompt", value: "Password" }],
      input: [{ name: "IDToken2", value: "" }]
    }
  ]
}
```

Respuesta `200 OK` del segundo `POST /authenticate`. Angular pinta el
formulario de credenciales y reutiliza estos callbacks rellenando sus `input`.

#### Punto 7.3 - error interno Kerberos/SPNEGO

Kerberos no envía un objeto JSON a Angular. A nivel PingAM/Java se materializa
como fallo GSS/Kerberos, representable así para documentación:

```typescript
{
  layer: "GSS-API / Kerberos",
  exception: "GSSException",
  major: "NO_CRED | DEFECTIVE_TOKEN | CREDENTIALS_EXPIRED | FAILURE | UNAUTHORIZED",
  minor: "KRB_AP_ERR_TKT_EXPIRED | KRB_AP_ERR_MODIFIED | KRB_AP_ERR_NOKEY | KRB_AP_ERR_SKEW | KRB_ERR_GENERIC",
  kerberosError: {
    msgType: 30,
    errorCode: 32,
    realm: "ADGBS.COM",
    sname: "HTTP/<pingam-host>",
    eText: "Ticket expired / modified / service key unavailable"
  }
}
```

#### Punto 9 - caída a credenciales

```typescript
{
  authId: "eyJhbGci...",
  callbacks: [
    {
      type: "NameCallback",
      output: [{ name: "prompt", value: "User Name" }],
      input: [{ name: "IDToken1", value: "" }]
    },
    {
      type: "PasswordCallback",
      output: [{ name: "prompt", value: "Password" }],
      input: [{ name: "IDToken2", value: "" }]
    }
  ]
}
```

#### Punto 11 - envío de credenciales

```typescript
{
  authId: "eyJhbGci...",
  callbacks: [
    {
      type: "NameCallback",
      output: [{ name: "prompt", value: "User Name" }],
      input: [{ name: "IDToken1", value: "usuario" }]
    },
    {
      type: "PasswordCallback",
      output: [{ name: "prompt", value: "Password" }],
      input: [{ name: "IDToken2", value: "password" }]
    }
  ]
}
```

#### Punto 12 - éxito de autenticación

```typescript
{
  successUrl: "/dashboard",
  tokenId: "AQIC5wM...",
  realm: "/"
}
```

La respuesta debe emitir SSO Cookie en navegador mediante `Set-Cookie` HttpOnly.
El front no lee esa cookie: usa `tokenId` funcionalmente para continuar `/authorize`.

#### Punto 12 - authorize

```typescript
{
  response_type: "code",
  client_id: "...",
  code_challenge_method: "S256",
  scope: "openid",
  redirect_uri: "...",
  state: "...",
  code_challenge: "...",
  csrf: "AQIC5wM...",
  assertion: "AQIC5wM..."
}
```

Respuesta esperada por la implementación local:

```typescript
{
  url: "https://neo.../token?code=...&state=..."
}
```

En entorno real, DataManager puede exponer la URL de un `302 Location` como
`DataManagerResponse.url`. `AuthorizeComponent` no navega el navegador al
`redirectUri`; extrae `code/state` y navega internamente a la ruta Angular
`/token`.

#### Punto 13 - token

```typescript
{
  grant_type: "authorization_code",
  redirect_uri: "...",
  code_verifier: "...",
  code: "..."
}
```

Respuesta:

```typescript
{
  access_token: "...",
  id_token: "..."
}
```

#### Punto S8 - formulario de PingAM hacia ACS NEO

```html
<form method="POST" action="<ACS URL NEO>">
  <input type="hidden" name="SAMLResponse" value="base64-saml-response" />
  <input type="hidden" name="RelayState" value="relay-state" />
</form>
```

En la implementación local, una SPA no puede leer directamente el body de un
POST de navegación. Por eso `mock-pingam` recibe primero ese form en
`POST /saml/acs`, guarda el payload y redirige a Angular:

```http
303 See Other
Location: http://localhost:4300/saml/acs?responseId=<id>
```

#### Punto S9 - recuperación local de SAMLResponse

```http
GET http://localhost:8081/saml/acs-response/<responseId>
```

Respuesta local:

```typescript
{
  samlResponse: "base64-saml-response",
  relayState: "relay-state"
}
```

#### Punto S10 - validación en NetScaler

```http
POST /validateSAMLResponse
Content-Type: application/x-www-form-urlencoded

SAMLResponse=base64-saml-response&RelayState=relay-state
```

Respuesta esperada en éxito:

```http
302 Found
Set-Cookie: <Citrix Session Cookie>; HttpOnly
Location: /saml/resources
```

Respuesta esperada en error:

```http
400 Bad Request
```

o

```http
401 Unauthorized
```

### 3.5 Auditoría de la implementación actual

| Punto | Estado actual | Acción para cumplir contrato objetivo |
|---:|---|---|
| 4 | Implementado en `AuthManagerService.initiateAuth()` con body `{}`. El mock devuelve `RedirectCallback`. | OK. |
| 5 | Implementado: `submitRedirectCallback()` crea form `GET` con `redirectUrl`; el navegador sale a PingAM/Entra. | OK. No es XHR. |
| 6-8 | Implementado en mock: `GET /mock-entra-id` simula error Entra ID + Kerberos y redirige `303 /login?authId=...`. | OK como simulación local del tramo externo. |
| 7 | Front ya no ejecuta Kerberos. Si PingAM devolviera `HttpCallback`, `AuthManager` lo trata como error de contrato. | OK. Kerberos ADGBS.com y Atenea deben resolverse internamente en PingAM. |
| 9 | Implementado: al entrar en `/login?authId=...`, `AuthManagerService.authenticate()` hace `POST /authenticate { authId }` y recibe `NameCallback` + `PasswordCallback`. | OK. |
| 11 | Angular reutiliza el callback de credenciales entregado por PingAM y solo rellena los `input` (`IDToken1`, `IDToken2`). | OK. |
| 12 | Implementado: `AUTH_SUCCESS` guarda `successData` y navega a `/authorize`. | OK. |
| 13 | Implementado: `authorize()` crea formulario POST y el mock responde `302 Location: /token?code=...&state=...`. | OK. Debe verse como navegación/redirect del navegador, no como XHR. |
| 14-15 | Implementado: `getTokens()` obtiene tokens, llama a `setAuthorization()` y navega a `/saml/authorization-request`, que formaliza `/authnRequest`. | OK. No debe navegar a `/saml/resources` antes de validar `SAMLResponse`. |
| S6-S7 | Implementado: `GetAuthorizationRequestComponent` rellama `/authnRequest`; `mock-citrix` responde `302` a PingAM; `mock-pingam` devuelve `SAMLResponse` si hay SSO Cookie. | OK. |
| S8-S9 | Implementado para local: `SamlAcsController` guarda el form POST y `ACSComponent` recupera `{ samlResponse, relayState }` por `responseId`. | OK como adaptador SPA local; en real debe cerrarse cómo llega el POST ACS a Angular/infra NEO. |
| S10 | Implementado: `ACSComponent` prepara el form y `SamlFormComponent` autoenvía `POST /validateSAMLResponse`; `mock-citrix` valida y responde `302` + Citrix cookie. | OK. El step visual se muestra antes del autoenvío. |
| S11 | Implementado: tras el `302`, `/saml/resources` ejecuta `GET /resources`; el `200 OK` es el único éxito SAML definitivo. | OK. |

---

## 4. Arquitectura Front — componentes y responsabilidades

### Estructura de MFEs
```
Shell (compartida con WS1 y WS2)
    └── invoca AuthManager al arrancar en ruta root

Instancia Proteo4
    ├── AuthManager (pieza de core — lógica del flujo)
    │   └── LoginService / Login MFE (orquestador)
    │       ├── carga OAuth Flow (módulo expuesto del Login MFE)
    │       └── carga SAML Flow (módulo expuesto del Login MFE)
    └── Data Manager (almacenamiento de tokens, gestión de cookies)
```

**Login MFE** es un MicroFrontend 100% standalone que expone sus módulos vía Module Federation. OAuth Flow y SAML Flow son componentes expuestos de este MFE — no MFEs independientes.

### Responsabilidades por componente

| Componente | Responsabilidad | Lo que NO hace |
|---|---|---|
| **Shell** | Navega al punto de entrada, entrega config a AuthManager, recibe tokens vía Data Manager | No orquesta auth, no conoce flujos |
| **AuthManager** | Recibe config de Shell, diseña flujos con LoginService | — |
| **LoginService (Login MFE)** | Orquesta qué módulo se consume según contexto y eventos recibidos | — |
| **OAuth Flow** | Gestiona `/authorize`, `/authenticate`, `/token` | No conoce SAML ni Citrix |
| **SAML Flow** | Orquesta `/resources`, navegación a `/authnRequest`, ACS NEO y form POST a `/validateSAMLResponse` | No conoce OAuth Flow, no habla con Shell |
| **Data Manager** | Almacena access_token, id_token; infiere presencia de cookies HttpOnly | — |
| **Citrix Utils** | Consume Citrix Workspace App SDK para streaming | — |

### Atomización de componentes

**OAuth Flow — componentes internos:**
```
OAuthFlowComponent (entry point, lazy)
    ├── POST /authenticate {} → 200 RedirectCallback
    ├── form GET redirectUrl → Entra ID/PingAM → 303 /login?authId=...
    ├── POST /authenticate { authId } → 200 NameCallback + PasswordCallback
    ├── POST /authenticate { authId, callbacks usuario/password } → 200 tokenId + Set-Cookie SSO
    ├── form POST /authorize → 302 Location /token?code=&state=
    └── CallbackComponent (ruta: /token)
        ├── recibe code + state
        ├── POST /token → access_token + id_token
        └── almacena tokens en Data Manager
```

**SAML Flow — componentes internos** (implementado en `src/app/saml-flow/`; detalle del flujo en el apartado 3 y en `context-SAML.md`):
```
ResourcesComponent (entry point, expone ./SamlMfe)
    └── GET /resources (XHR)
        ├── 200 OK → emite saml:success (Caso 4 — happy path)
        └── 401 → window.location / form hacia /authnRequest (sin CORS)
            [Angular abandona contexto]
            [Navegador sigue 302 NetScaler → PingAM SSO → form auto-enviado]
            [Angular retoma en ACSComponent, ACS URL de NEO]

ACSComponent (ruta = ACS URL de NEO, expone ./ACSComponent)
    └── recupera SAMLResponse + RelayState (form POST de PingAM; adaptador local por responseId)
        ├── ausente/inválida → emite saml:error
        └── construye form → POST /validateSAMLResponse en NetScaler
            [Angular abandona contexto]
            [NetScaler valida aserción → Citrix Session Cookie → redirect a NEO]
            [Angular retoma en ResourcesComponent]
                └── GET /resources → 200 OK → emite saml:success → LoginService
```

---

## 5. Orquestación secuencial — LoginService

Los MFEs son completamente desacoplados entre sí. LoginService es el único que conoce la lógica de transición.

```
LoginService
    └── carga SAML Flow
        └── saml:unauthorized (SSO Cookie inválida)
            └── carga OAuth Flow
                └── oauth:success
                    └── recarga SAML Flow (desde ResourcesComponent — siempre desde el inicio)
                        └── saml:success → streaming disponible
```

---

## 6. Estrategia de Recuperación Progresiva

AuthManager asume el escenario más favorable y solo activa flujos cuando un 401 lo confirma. La Shell no participa — es lógica interna de Proteo4.

**Cuatro casos de uso:**

| Caso | SSO Cookie | Citrix Cookie | Sesión Windows | Flujos activados |
|---|---|---|---|---|
| **1 — Arranque en frío** | ❌ | ❌ | ❌ | OAuth completo → SAML completo |
| **2 — SSO activa, Citrix expirada, Windows off** | ✅ | ❌ | logged off | Solo SAML (nueva sesión Windows en VDA) |
| **3 — SSO activa, Citrix expirada, Windows activa** | ✅ | ❌ | ✅ Connected | Solo SAML (Workspace Control reconecta sin interrupción) |
| **4 — Todo activo** | ✅ | ✅ | ✅ Connected | Ninguno — /resources → 200 directo |

**Caso 3 es el más delicado:** el usuario está en streaming y la Citrix cookie expira silenciosamente (HDX/SSE no renueva cookies web). La renovación es transparente gracias a Workspace Control.

---

## 7. Contrato de eventos con LoginService (pendiente de cierre con Arquitectura)

### Eventos que emite OAuth Flow:
- `oauth:success` — tokens obtenidos, SSO Cookie establecida
- `oauth:error` — fallo no recuperable

### Eventos que emite SAML Flow:
- `saml:success` — Citrix Session Cookie obtenida, recursos disponibles
- `saml:unauthorized` — 401 en /SSORedirect → LoginService carga OAuth Flow
- `saml:error` — fallo no recuperable

### Interfaces de entrada de cada MFE (pendiente de cierre con Arquitectura):

**OAuth Flow necesita:**
- URLs de endpoints (`/authorize`, `/authenticate`, `/token`)
- `redirect_uri` (ruta del CallbackComponent)
- `client_id`
- `scope`

**SAML Flow necesita:**
- URL de `/resources` (entrada inicial y comprobación final tras `/validateSAMLResponse`)
- URL de `/authnRequest` (entrada SAML inicial y rellamada post-token — GET o POST, pendiente confirmar con Citrix/back)
- ACS URL de NEO (ruta del `ACSComponent`, recepción de `SAMLResponse`)
- ACS URL de NetScaler (`/validateSAMLResponse`, validación de `SAMLResponse`)
- URL de fallback PingAM → login OAuth cuando no existe SSO Cookie activa

---

## 8. Rutas críticas (pendiente de registro en PingAM, Entra ID y Citrix ADC)

| Ruta | Componente | Registrar en |
|---|---|---|
| `/token` | CallbackComponent (OAuth) | PingAM como redirect_uri + Entra ID |
| `/saml/acs` (o equivalente) | ACSComponent (SAML) | PingAM como ACS URL del IDP + Shell config |
| `/login?samlSso=unauthorized` (ruta local completa: `http://localhost:4300/login?samlSso=unauthorized`) | LoginComponent (fallback SAML → OAuth) | PingAM/Apigee + Shell config |

Ambas rutas deben estar en los archivos de configuración de la Shell para que el router Angular las resuelva al recibir redirects externos.

---

## 9. Endpoints reales (de este proyecto — referencia para NEO)

```typescript
// Proyecto login (usuarios light) — referencia
authenticate: '/digital/party-authentication/v4/light-users/authenticate'
authorize:    '/digital/party-authentication/v4/oauth2/authorize'
tokens:       '/digital/party-authentication/v4/oauth2/token'

// NEO (usuarios empleados) — pendiente de confirmar con back
authenticate: '/digital/party-authentication/v4/employees/authenticate'  // probable
authorize:    '/digital/party-authentication/v4/oauth2/authorize'         // mismo
tokens:       '/digital/party-authentication/v4/oauth2/token'             // mismo
```

**Proxy local:**
- `/proxy` → `https://openapi.int.es.bs` (Apigee INT)
- `/lib`, `/app` → CDN Proteo4

---

## 10. Module Federation — exposes (referencia de este proyecto)

```javascript
// webpack.config.js — login (referencia actual, incluye OAuth + SAML Flow)
exposes: {
  './loginApplication':      './src/bootstrap/bootstrap-child.module.ts',
  './AuthorizeComponent':    '...authorize.component.ts',       // OAuthFlowComponent
  './GetTokensComponent':    '...get-tokens.component.ts',      // CallbackComponent
  './LoginComponent':        '...login.component.ts',           // Entry point OAuth
  './SamlMfe':               '...saml-flow/presentation/pages/resources/resources.component.ts',       // Entry point SAML
  './ACSComponent':          '...saml-flow/presentation/pages/acs/acs.component.ts', // ACS URL de NEO
}

// Para NEO — mapeo nomenclatura DA original → implementación actual
// './LoginApplication' (DA) ≈ './loginApplication'
// './OAuthFlow' (DA)        ≈ './LoginComponent' + './AuthorizeComponent' + './GetTokensComponent'
// './SamlMfe' (DA esperaba saml-entry.component.ts) → implementado apuntando a resources.component.ts
// './ACSComponent' — expose adicional no contemplado en el DA, requerido como ACS URL de NEO
```

---

## 11. Configuración OAuth (referencia de este proyecto)

```json
{
  "DATA_MANAGER": "PARTY_AUTHENTICATION",
  "AUTH_TYPE": "LIGHT_USERS",
  "CLIENT_ID": "oficina-remota-app",
  "REDIRECT_URI": "http://localhost:4500/token",
  "SCOPES": ["openid"]
}
```

Para NEO: `AUTH_TYPE` será `EMPLOYEES`, `CLIENT_ID` será el registrado en PingAM para NEO.

---

## 12. Librerías Proteo4 relevantes

| Librería | Uso |
|---|---|
| `@proteo/data-manager` | Almacenamiento de tokens, gestión de llamadas HTTP |
| `@proteo/event-bus` | Comunicación entre MFEs vía eventos |
| `@proteo/authorization-utils` | Utilities de autorización |
| `@proteo/cookie-utils` | Gestión de cookies |
| `@proteo/ng-routing` | Routing Proteo4 |
| `@proteo/ng-bootstrap` | Bootstrap (`provideProteoBootstrap`) |
| `@proteo/storage-utils` | Almacenamiento persistente |

**Eventos BRIDGE relevantes:**
- `SET_LIGHTLOGIN_OK` — señal de login completado (equivalente funcional a `oauth:success`)
- `REQUEST_REFRESH_TOKENS` — gestión de refresco de tokens

---

## 13. Arquitectura hexagonal — estructura de carpetas

```
src/app/login/
    ├── domain/
    │   ├── constants/       ← global.constants.ts (tEnvName, etc.)
    │   ├── models/          ← interfaces y tipos de dominio
    │   └── repositories/    ← interfaces de repositorio
    ├── application/
    │   └── services/        ← lógica de aplicación, casos de uso
    ├── infrastructure/
    │   ├── backend/         ← implementaciones reales de repositorios
    │   ├── mock/            ← implementaciones mock
    │   └── store/           ← NgRx reducers, actions, effects
    └── presentation/
        └── pages/           ← componentes Angular
            ├── authorize/   ← AuthorizeComponent (form POST /authorize)
            ├── get-tokens/  ← CallbackComponent (POST /token)
            └── login/ ← LoginComponent (entry point)
```

---

## 14. Tokens de inyección local (desarrollo)

```typescript
export interface LocalAuthToken {
  access_token: string;
  id_token: string;
}
export const LOCAL_AUTH_TOKEN = new InjectionToken<LocalAuthToken>('LOCAL_AUTH_TOKEN');
```

- En local/int: tokens inyectados desde `local-conf/tokens.json`
- En deploy (pre/pro): `auth: null` — el flujo OAuth real es el único mecanismo

---

## 15. Subflujos del árbol de autenticación PingAM — POST /authenticate

El endpoint `/authenticate` de PingAM implementa un árbol de autenticación con cuatro nodos evaluados en orden. Los tres primeros son transparentes al usuario. Todos los subflujos comparten la interfaz `TreeCallbackModel` para el intercambio de callbacks.

### Interfaces relevantes

```typescript
interface TreeCallbackModel {
  authId?: string
  callbacks?: CallbackModel[]
  stage?: string
}
interface CallbackModel {
  type: string
  output: NameValueModel[]
  input?: NameValueModel[]
  _id?: number
}
interface ISuccessOtpRespone {
  successUrl: string
  tokenId: string
  realm: string
}
```

El `authId` es el identificador de estado del árbol en PingAM. Debe preservarse entre llamadas para que PingAM sepa en qué nodo está. Sin `authId`, PingAM reinicia el árbol desde el principio.

---

### CASO 1 — EntraID con éxito

1. FRONT: POST `/authenticate` con body vacío
2. PingAM: responde con `RedirectCallback`
```typescript
{ authId: "eyJhbGci...", callbacks: [{ type: "RedirectCallback",
    output: [{ name: "redirectUrl", value: "https://login.microsoftonline.com/..." },
             { name: "trackingCookie", value: true }],
    input:  [{ name: "IDToken1", value: "" }] }] }
```
3. FRONT: crea `<form method="GET" action="redirectUrl">` con los query params como inputs hidden y hace `form.submit()`. Navegador abandona contexto Angular.
4. EntraID: autentica al usuario vía SSO de estación de trabajo y redirige a PingAM `/social/redirect?code=...&state=...`
5. PingAM: procesa el code internamente, establece SSO Cookie (`Set-Cookie`) y redirige con `302` a Angular `/token?code=...&state=...`

**Nota:** El `IDToken1` del input del `RedirectCallback` es un artefacto estructural del modelo — el front no lo rellena. El token de EntraID viaja directamente de EntraID a PingAM, nunca pasa por Angular.

---

### CASO 2 — EntraID/Kerberos fallan → vuelta a Angular con authId

1-3. Igual que Caso 1 pasos 1-3
4. EntraID: falla y redirige a PingAM `/social/redirect?error=...`
5. PingAM: prueba Kerberos ADGBS.com internamente y falla
6. PingAM: prueba Kerberos Atenea internamente y falla
7. PingAM: redirige al navegador de vuelta a Angular:
```http
303 See Other
Location: /login?authId=eyJhbGci...
```
8. FRONT: `LoginComponent` lee `authId` de la URL y ejecuta:
```typescript
POST /authenticate
{ authId: "eyJhbGci..." }
```
9. PingAM responde:
```typescript
{ authId: "eyJhbGci...",
  callbacks: [
    { type: "NameCallback",     output: [{ name: "prompt", value: "User Name" }], input: [{ name: "IDToken1", value: "" }] },
    { type: "PasswordCallback", output: [{ name: "prompt", value: "Password"  }], input: [{ name: "IDToken2", value: "" }] }
  ] }
```

---

### CASO 3 — Credenciales

1. FRONT: usuario introduce credenciales
2. FRONT: reutiliza los callbacks recibidos y rellena sus `input`
3. FRONT: POST `/authenticate` con:
```typescript
{ authId: "eyJhbGci...",
  callbacks: [
    { type: "NameCallback",     output: [{ name: "prompt", value: "User Name" }], input: [{ name: "IDToken1", value: "user@adgbs.com" }] },
    { type: "PasswordCallback", output: [{ name: "prompt", value: "Password"  }], input: [{ name: "IDToken2", value: "••••••••" }] }
  ] }
```
4. PingAM: valida credenciales, establece SSO Cookie (`Set-Cookie`) y responde:
```typescript
{ successUrl: "/dashboard", tokenId: "AQIC5wM...", realm: "/" }
```

---

### Mecanismos clave transversales

| Mecanismo | Descripción |
|---|---|
| `authId` | Identifica el estado del árbol PingAM. Sin él, el árbol reinicia desde EntraID. Debe preservarse entre llamadas. |
| `RedirectCallback` | PingAM pide al front que navegue a una URL externa. El front crea un form y hace submit. Angular pierde el contexto. |
| `HttpCallback` | No debe llegar al front en esta POC. Kerberos ADGBS.com y Atenea se resuelven internamente en PingAM. |
| `NameCallback` + `PasswordCallback` | PingAM pide credenciales. El front las recoge del formulario y las envía en el input de cada callback. |
| SSO Cookie | Se establece como `Set-Cookie` en la respuesta del `/authenticate` exitoso. El front nunca la lee (HttpOnly). Su presencia se infiere por el `200 OK` con `ISuccessOtpRespone`. |
| `withCredentials: true` | Se mantiene para cookies/credenciales de navegador en llamadas XHR, pero el token SPNEGO no se modela como responsabilidad del front. |

---

## 16. Planificación — 4 sprints (deadline: 4 agosto)


### Sprint 1 — Fundamentos y contrato
- S1-1: Cierre contrato con Arquitectura (eventos, interfaces, tipos Proteo4)
- S1-2: Definición de rutas callback (acuerdo con PingAM y Citrix)
- S1-3: Scaffolding OAuth Flow y SAML Flow
- S1-4: Configuración Data Manager (tokens y cookies)
- S1-5: Setup entorno INT

### Sprint 2 — OAuth Flow
- S2-1: OAuthFlowComponent (/authorize)
- S2-2: AuthenticateComponent (/authenticate + redirect Entra ID)
- S2-3: CallbackComponent (/token + SSO Cookie + oauth:success)
- S2-4: Integración con LoginService vía eventos
- S2-5: Pruebas flujo OAuth completo en INT

### Sprint 3 — SAML Flow
- S3-1: ✅ ResourcesComponent (/resources, llamadas 1/2/6) — implementado en `src/app/saml-flow/`
- S3-2: ✅ ACSComponent (ACS URL de NEO + POST /validateSAMLResponse) — implementado en `src/app/saml-flow/`
- S3-3: ✅ SamlManagerService mock (orquestación + eventos saml:success/unauthorized/error, patrón Option B EventBus)
- S3-4: Validación 4 casos de uso Recuperación Progresiva en INT — pendiente (requiere entorno PingAM/NetScaler real)
- S3-5: Integración con Citrix Utils y Workspace App SDK — pendiente

Detalle completo del flujo SAML + OAuth/OIDC en el apartado 3 y bindings/eventos base en `context-SAML.md`.

### Sprint 4 — Hardening, seguridad y cierre
- S4-1: Validación atributos cookies (SameSite, HttpOnly, Secure)
- S4-2: Validación firma y cifrado SAML
- S4-3: Gestión de errores y casos edge
- S4-4: Single Logout (SLO) en front
- S4-5: Pruebas e2e en PRE
- S4-6: Documentación técnica final

---

## 16. Dependencias y riesgos conocidos

| Dependencia | Impacto | Estado |
|---|---|---|
| Contrato eventos/interfaces con Arquitectura (Proteo4) | Bloquea Sprint 2 y 3 | Pendiente |
| FQDN definitivo Virtual Server ADC de NEO | Determina valor SameSite de cookies | Pendiente |
| Disponibilidad entorno PRE Citrix completo | Limita validación pre-producción | Parcial |
| Endpoints empleados confirmados por back | Necesario para Sprint 2 | Pendiente confirmación |
| Registro ACS URL en Citrix ADC | Bloquea SAML Flow | Pendiente (S1-2) |

---

## 17. Notas sobre cookies de sesión Citrix

Las cookies NSC_TMAA y NSC_TMAS emitidas por Citrix NetScaler/ADC:
- **HttpOnly**: activo por defecto — no accesibles desde JavaScript
- **Secure**: añadible vía políticas de Rewrite en Virtual Server SSL
- **Path**: `/` por limitación de producto en Virtual Servers VPN — no modificable
- **SameSite**: pendiente de definición según topología de dominios
  - Si mismo dominio raíz (eTLD+1): `Strict` o `Lax`
  - Si dominios distintos (cross-site): `None; Secure` — requiere aprobación de Seguridad

**La Citrix Session Cookie es HttpOnly** — el front no puede leerla desde JavaScript. Su presencia/ausencia se infiere por las respuestas HTTP (200 vs 401 en GET /resources).

---

## 18. Segunda iteración POC — Shell NEO + MFE Login

Durante la segunda iteración se consolidó una POC local con `front-app-shell` como host en `localhost:4300` y `front-app-login` como microfrontend remoto en `localhost:4500`.

### Integración Module Federation

- El shell carga `remoteEntry.js` de login desde `http://localhost:4500/remoteEntry.js`.
- El host crea una única instancia cacheada del módulo remoto `Application` (`./loginApplication`) y la usa como `environmentInjector` al instanciar componentes remotos.
- Esto evita perder providers entre rutas federadas como `/login`, `/authorize`, `/token` y `/saml/resources`.
- Los tokens de inyección del flujo OAuth (`AUTHORIZE_FN`, `GET_TOKENS_FN`, `INITIALIZE_FN`, `END_SESSION_FN`, `REVOKE_FN`) se proveen en `bootstrap-child.module.ts`, no solo en `LoginPageComponent`, porque el shell puede crear componentes expuestos directamente.

### Diferencias local standalone vs shell

- Standalone login (`localhost:4500`) mantiene endpoints locales directos a los mocks.
- Shell (`localhost:4300`) usa proxy `/digital` hacia `mock-pingam` (`localhost:8081`) para evitar CORS.
- El proxy del shell reescribe `Origin` a `http://localhost:4500` porque el mock PingAM local solo admite ese origen.
- El bootstrap federado carga config de login desde `http://localhost:4500/conf/` para evitar intentos a `localhost:4200`.

### Trazabilidad visual para POC

- Los modales de confirmación se sustituyeron en modo shell por una traza lateral acumulativa.
- Cada paso emite un evento `neoFlowStep`; la shell lo muestra en el panel derecho con título, descripción, hora y mini-diagrama secuencial.
- El flujo queda pausado hasta pulsar `Siguiente` en la tarjeta correspondiente (`neoFlowStepNext`).
- Los loaders fullscreen del MFE no se renderizan cuando `window.NEO_SHELL` está activo, para no tapar la traza lateral.

### Árbol OAuth local

El mock `mock-pingam` representa ya el tramo federado con reanudación:

1. `POST /authenticate {}` devuelve `RedirectCallback`.
2. Angular envía un form `GET` con `redirectUrl`.
3. `GET /mock-entra-id` simula error Entra ID + Kerberos y redirige a `/login?authId=...`.
4. Angular ejecuta `POST /authenticate { authId }`.
5. PingAM devuelve `NameCallback` + `PasswordCallback`.
