# context-SAML.md — Flujo SAML SP-Initiated / NEO WS3

Este documento recoge el contexto técnico completo del flujo SAML 2.0 SP-Initiated para el acceso a recursos Citrix desde NEO. Complementa al CONTEXT.md general del proyecto.

⚠️ CORRECCIÓN CLAVE RESPECTO AL DA ORIGINAL: el front NO hace una llamada explícita a
PingAM (/SSORedirect) para obtener la SAML Response. Es el navegador quien contacta con
PingAM siguiendo el 302 de NetScaler, y PingAM devuelve un formulario HTML auto-enviado.
Ver secciones 4 y 5.

---

## 1. Visión general del flujo

El flujo SAML es la segunda fase del proceso de autenticación combinado de NEO. Su objetivo es obtener la **Citrix Session Cookie** (HttpOnly) que permite al usuario acceder a los recursos publicados en Citrix (Eclipse Lite) y activar el streaming.

**Prerrequisito obligatorio:** SSO Cookie activa en el navegador, establecida por el flujo OAuth previo.

**Patrón:** SP-Initiated. NetScaler (SP) inicia el flujo generando la SAMLRequest; PingAM (IDP) emite la SAML Response.

**Principio rector:** Recuperación Progresiva — el flujo solo se activa cuando un 401 confirma que la sesión Citrix ha expirado o no existe.

---

## 2. Conceptos fundamentales

### Angular vs Navegador
Angular es código JavaScript que corre DENTRO del navegador. Son dos capas distintas:
- **Navegador:** hace peticiones HTTP, gestiona cookies, sigue redirects 302, renderiza HTML y ejecuta formularios auto-enviados. Algunas acciones las hace SOLO, sin que Angular las ordene ni las vea.
- **Angular:** aplicación JavaScript cargada por el navegador. Hace peticiones HTTP vía HttpClient (XHR), pero NO controla los redirects ni los formularios que el navegador ejecuta por su cuenta.

### XHR vs Navegación — implicaciones de CORS
- **XHR / fetch / HttpClient:** peticiones HTTP controladas por JavaScript. SUJETAS a CORS.
- **Navegación (`window.location.href`) / envío de formulario (`form.submit()`):** peticiones del navegador. NO sujetas a CORS.

Esta distinción es la razón por la que ciertas llamadas del flujo NO pueden hacerse con HttpClient: al ir hacia dominios externos (NetScaler, PingAM) que no tienen CORS configurado para NEO, fallarían. Se usan navegaciones o formularios en su lugar.

### SAML Response vs Aserción
- **SAML Response:** el "sobre". Mensaje completo de PingAM con metadatos del protocolo (status, issuer, timestamps).
- **Aserción (Assertion):** el contenido dentro del sobre. XML firmado digitalmente con los datos del usuario: `saml:subject` (UPN), emisor (PingAM), destinatario (NetScaler), caducidad y atributos (roles, grupos).

La SAML Response CONTIENE la aserción. NetScaler abre el sobre, extrae la aserción, verifica su firma y lee el `saml:subject` para identificar al usuario.

### ACS (Assertion Consumer Service)
Endpoint del SP donde el IDP entrega la SAML Response. Es una URL registrada en la configuración SAML que le dice al IDP: "cuando tengas la aserción lista, envíala aquí".

⚠️ En este flujo hay DOS ACS URLs distintas:
- **ACS URL de NEO:** ruta del front (`/auth/saml/acs`, SamlResponseComponent) donde PingAM envía la SAML Response vía formulario auto-enviado.
- **ACS URL de NetScaler:** endpoint del SP donde el front reenvía la SAML Response para que NetScaler la valide y emita la Citrix Session Cookie.

---

## 3. Bindings SAML — los dos tramos son independientes

SAML define un binding (mecanismo de transporte) por cada tramo, y son INDEPENDIENTES entre sí:

| Tramo | Qué viaja | Binding posible |
|---|---|---|
| SP → IDP | SAMLRequest (AuthnRequest) | HTTP-Redirect (GET) **o** HTTP-POST |
| IDP → SP | SAMLResponse (aserción) | HTTP-POST (habitual por el tamaño y la firma) |

**Implicación crítica:** que la respuesta (IDP → SP) sea HTTP-POST NO determina si la petición (SP → IDP) es GET o POST. Cuando se dice "el flujo SAML es HTTP-POST" normalmente se refiere al binding de la RESPUESTA.

La combinación más común en NetScaler como SP es **"request as Redirect, response as POST"**: la SAMLRequest se envía vía HTTP-Redirect (GET) y la SAML Response llega vía HTTP-POST. Esto es lo que aparece en la documentación oficial de Citrix.

**Lo que determina la llamada 2 del front** (ver sección 4) es cómo está configurado NetScaler para enviar la SAMLRequest al IDP. PENDIENTE DE CONFIRMAR con el equipo de Citrix/back si /authnRequest espera GET o POST.

---

## 4. Lista de llamadas del flujo — al detalle

Premisa: SSO Cookie activa en el navegador.

### Llamada 1 — GET /resources
- **Desde:** `ResourcesComponent`
- **Mecanismo:** `HttpClient` (XHR — sujeta a CORS)
- **Hacia:** NetScaler / StoreFront
- **Qué envía:** Citrix Session Cookie si existe (automático, HttpOnly)
- **Respuestas:**
  - `200 OK` → recursos disponibles, streaming activado → fin del flujo (Caso 4 — happy path)
  - `401 Unauthorized` → sin sesión Citrix → dispara el flujo SAML

### Llamada 2 — GET o POST /authnRequest
- **Desde:** `ResourcesComponent`
- **Mecanismo:** `window.location.href` si GET / formulario si POST — **PENDIENTE confirmar con Citrix/back**
- **Hacia:** NetScaler
- **Qué envía:** NADA. El front no tiene parámetros que enviar — es solo el pistoletazo de salida del flujo SP-Initiated. La SAMLRequest y el RelayState los genera NetScaler.
- **Por qué NO se usa HttpClient:** NetScaler responde con 302 hacia PingAM. Con HttpClient, el navegador seguiría el redirect transparentemente pero PingAM no tiene CORS configurado para ese endpoint → fallaría. Y aunque no fallara, HttpClient recibiría el formulario HTML de PingAM como texto plano y el `form.submit()` nunca se ejecutaría → flujo roto.
- **Qué hace NetScaler:** genera la SAMLRequest (AuthnRequest XML firmada) + RelayState, y responde:
  `302 → https://pingam.../sso/endpoint?SAMLRequest=base64...&RelayState=...`
- **⚠️ Angular abandona el contexto aquí**

### Llamada 3 — GET SSO endpoint PingAM (AUTOMÁTICA — no la controla el front)
- **Quién:** el navegador, siguiendo el 302 de NetScaler
- **Mecanismo:** navegación automática del navegador — Angular no interviene, no hay código que la ejecute
- **Hacia:** SSO endpoint de PingAM
- **Qué envía el navegador automáticamente:**
  - SAMLRequest (en parámetros de URL, generada por NetScaler)
  - RelayState (en parámetros de URL, generado por NetScaler)
  - SSO Cookie (automática, dominio coincide con el de emisión)
- **Por qué no hay CORS:** es navegación del navegador, no XHR
- **Qué hace PingAM:** valida la sesión (SSO Cookie), genera la SAML Response (con la aserción firmada), y devuelve un HTML con formulario auto-enviado:
  ```html
  <body onload="document.forms[0].submit()">
    <form method="POST" action="https://neo.../auth/saml/acs">
      <input type="hidden" name="SAMLResponse" value="base64..."/>
      <input type="hidden" name="RelayState" value="..."/>
    </form>
  </body>
  ```

### Llamada 4 — POST ACS URL de NEO (AUTOMÁTICA — no la controla el front)
- **Quién:** el navegador, ejecutando el `form.submit()` del HTML de PingAM
- **Mecanismo:** formulario HTML auto-enviado por el navegador — Angular no interviene
- **Hacia:** ACS URL de NEO (`/auth/saml/acs`) — ruta del `SamlResponseComponent`
- **Qué envía:** SAMLResponse (base64) + RelayState
- **Por qué no hay CORS:** envío de formulario, no XHR
- **Resultado:** el navegador carga `/auth/saml/acs`. Angular arranca de nuevo, el router resuelve la ruta y carga `SamlResponseComponent`, que se inicializa con la SAMLResponse en el body del POST recibido.
- **⚠️ Angular retoma el contexto aquí**

### Llamada 5 — POST ACS URL de NetScaler
- **Desde:** `SamlResponseComponent`
- **Mecanismo:** formulario construido programáticamente por Angular + `form.submit()`. SIEMPRE formulario (lo confirma el responsable del proyecto: se construye un form donde se le mete la URL).
- **Hacia:** ACS URL de NetScaler (distinta de la ACS URL de NEO)
- **Qué envía:** SAMLResponse (base64) + RelayState — recogidos del body del POST de la llamada 4
- **Por qué formulario y no HttpClient:** NetScaler es dominio externo. Con HttpClient habría CORS. El formulario es navegación del navegador — sin CORS.
- **Qué hace NetScaler:** abre la SAML Response, extrae la aserción, verifica la firma, valida el UPN del `saml:subject`, establece la sesión Citrix y emite la Citrix Session Cookie (HttpOnly). En paralelo delega en StoreFront → FAS → AD para emitir el certificado Windows que abrirá la sesión en el VDA.
- **Respuesta:** NetScaler redirige el navegador de vuelta a NEO hacia una URL de retorno CONFIGURADA EN NETSCALER (no en el formulario — el `form.action` apunta a NetScaler; la URL de retorno es independiente). PENDIENTE de acordar con el equipo de Citrix.
- **⚠️ Angular abandona el contexto aquí también**

### Llamada 6 — GET /resources
- **Desde:** `ResourcesComponent` (Angular retoma en la URL de retorno de NetScaler)
- **Mecanismo:** `HttpClient` (XHR)
- **Hacia:** NetScaler / StoreFront
- **Qué envía:** Citrix Session Cookie (automática, HttpOnly — emitida en la llamada 5)
- **Respuesta esperada:** `200 OK` + objeto de recursos → emite `saml:success` → LoginService → streaming disponible

---

## 5. Resumen — quién envía qué y con qué mecanismo

| # | Llamada | Quién la envía | XHR? | Mecanismo | CORS |
|---|---|---|---|---|---|
| 1 | GET /resources | Front (Angular) | ✅ Sí | HttpClient | Aplica |
| 2 | GET/POST /authnRequest | Front (Angular) | ❌ No | window.location / form | No aplica |
| 3 | GET SSO PingAM | Navegador (auto) | ❌ No | navegación automática | No aplica |
| 4 | POST ACS URL NEO | Navegador (auto) | ❌ No | form auto-enviado (PingAM) | No aplica |
| 5 | POST ACS URL NetScaler | Front (Angular) | ❌ No | formulario construido por Angular | No aplica |
| 6 | GET /resources | Front (Angular) | ✅ Sí | HttpClient | Aplica |

- **Llamadas que el front controla explícitamente:** 1, 2, 5, 6
- **Llamadas automáticas del navegador:** 3, 4
- **Únicas llamadas XHR:** 1 y 6 (ambas GET /resources con HttpClient)

```
1. HttpClient    GET /resources          → 401
                                           ↓
2. location/form GET o POST /authnRequest → 302 hacia PingAM
                                           ↓  [Angular abandona contexto]
3. Navegador     GET PingAM SSO           → formulario HTML
   (automático)  + SAMLRequest + SSO Cookie
                                           ↓
4. Navegador     POST ACS URL NEO         → [Angular retoma contexto]
   (automático)  + SAMLResponse + RelayState
                                           ↓
5. Form (Angular) POST ACS NetScaler      → Citrix Session Cookie
                  + SAMLResponse          → redirect a NEO [Angular abandona]
                                           ↓
6. HttpClient    GET /resources           → 200 OK → streaming
```

---

## 6. Caso alternativo — SSO Cookie inválida o ausente

En la llamada 3, si el navegador llega a PingAM sin SSO Cookie activa o expirada, PingAM no puede resolver la sesión y el flujo se interrumpe. Angular retoma el control en un estado de error.

```
SamlResponseComponent (o ResourcesComponent según el punto de fallo)
    └── detecta ausencia de SAMLResponse válida
        └── emite saml:unauthorized → LoginService
            └── LoginService activa OAuth Flow
                └── oauth:success → LoginService reactiva SAML Flow
                    └── flujo SAML completo desde ResourcesComponent
```

Los MFEs no se conocen entre sí. La lógica de transición reside exclusivamente en LoginService.

---

## 7. Componentes y nomenclatura

| Nombre en DT | Nombre anterior | Responsabilidad |
|---|---|---|
| `ResourcesComponent` | `SamlEntryComponent` | Entry point: GET /resources (llamadas 1 y 6), inicia /authnRequest (llamada 2) |
| `SamlResponseComponent` | `ACSComponent` | Recibe la SAML Response en la ACS URL de NEO (llamada 4), reenvía a NetScaler (llamada 5) |

### Esqueleto de ResourcesComponent (referencia)
```typescript
@Component({ ... })
export class ResourcesComponent {
  private readonly http = inject(HttpClient);

  async getResources(): Promise<void> {
    try {
      const resources = await firstValueFrom(this.http.get('/resources'));
      // 200 → saml:success → LoginService
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 401) {
        // El navegador toma el control — Angular muere aquí
        window.location.href = '/authnRequest';   // si GET
        // o construir y enviar un formulario POST si NetScaler espera POST
      }
    }
  }
}
```

### Esqueleto del envío de formulario (llamada 5, en SamlResponseComponent)
```typescript
submitSamlResponse(samlResponse: string, relayState: string): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = '<ACS URL de NetScaler>';

  const inputSaml = document.createElement('input');
  inputSaml.type = 'hidden';
  inputSaml.name = 'SAMLResponse';
  inputSaml.value = samlResponse;

  const inputRelay = document.createElement('input');
  inputRelay.type = 'hidden';
  inputRelay.name = 'RelayState';
  inputRelay.value = relayState;

  form.appendChild(inputSaml);
  form.appendChild(inputRelay);
  document.body.appendChild(form);
  form.submit();   // ⚠️ Angular abandona el contexto aquí
}
```

---

## 8. Eventos hacia LoginService

| Evento | Emitido desde | Cuándo | Acción de LoginService |
|---|---|---|---|
| `saml:success` | `ResourcesComponent` | GET /resources → 200 (happy path o tras flujo completo) | Proceso completado |
| `saml:unauthorized` | `SamlResponseComponent` | SSO Cookie inválida — sin SAMLResponse válida | Activar OAuth Flow |
| `saml:error` | cualquiera | Fallo no recuperable | Gestión de error |

---

## 9. Rutas críticas del SAML Flow

| Ruta | Componente | Descripción | Registrar en |
|---|---|---|---|
| ACS URL de NEO (ej. `/auth/saml/acs`) | `SamlResponseComponent` | Destino del formulario auto-enviado de PingAM | PingAM (ACS URL del IDP) + Shell config |
| ACS URL de NetScaler | — | Destino del POST de la llamada 5 | Configurado en NetScaler SAML SP profile |
| URL de retorno NetScaler → NEO | `ResourcesComponent` (probable) | Destino tras validación de NetScaler | Configurado en NetScaler — PENDIENTE acordar |

---

## 10. Atributos de la Citrix Session Cookie

| Atributo | Valor | Notas |
|---|---|---|
| `HttpOnly` | true | No accesible desde JavaScript — se infiere por respuestas HTTP (200 vs 401) |
| `Secure` | true | Solo HTTPS — aplicable en Virtual Server SSL |
| `Path` | `/` | Limitación de producto en VS VPN — no modificable |
| `SameSite` | Strict / None | Depende de si NEO y Citrix ADC son same-site o cross-site |
| `Domain` | FQDN del VS ADC de NEO | Pendiente de definición del FQDN definitivo |

Cookies de sesión NetScaler relevantes: `NSC_TMAA` (sesión AAA — usuario autenticado) y `NSC_TMAS` (sesión activa en Traffic Management). Ambas HttpOnly por defecto.

---

## 11. Estrategia de Recuperación Progresiva — casos de uso

| Caso | SSO Cookie | Citrix Cookie | Sesión Windows | Comportamiento |
|---|---|---|---|---|
| 1 — Arranque en frío | ❌ | ❌ | ❌ | saml:unauthorized → OAuth → SAML completo |
| 2 — SSO activa, Citrix expirada, Windows off | ✅ | ❌ | logged off | SAML completo, nueva sesión Windows en VDA |
| 3 — SSO activa, Citrix expirada, Windows activa | ✅ | ❌ | ✅ connected | SAML renueva cookie, Workspace Control reconecta |
| 4 — Todo activo | ✅ | ✅ | ✅ connected | GET /resources → 200 directo, ningún flujo |

**Caso 3 es el más crítico:** el tráfico HDX/SSE no renueva cookies web. La renovación debe ser transparente gracias a Workspace Control.

---

## 12. Module Federation

```javascript
exposes: {
  './SamlMfe': './src/app/saml-flow/presentation/pages/resources/resources.component.ts',
  './SamlResponseComponent': './src/app/saml-flow/presentation/pages/saml-response/saml-response.component.ts'
}
```

`./SamlMfe` permite que cualquier aplicación del ecosistema Proteo4 consuma el SAML Flow de forma independiente del OAuth Flow. `./SamlResponseComponent` se expone por separado para que la Shell pueda registrar la ACS URL de NEO (sección 9) como ruta independiente.

---

## 13. Arquitectura hexagonal — estructura de carpetas

```
src/app/saml-flow/
    ├── domain/
    │   ├── models/
    │   │   ├── saml-request.model.ts
    │   │   └── saml-response.model.ts
    │   └── repositories/
    │       └── saml.repository.ts
    ├── application/
    │   └── services/
    │       └── saml-flow.service.ts
    ├── infrastructure/
    │   └── backend/
    │       └── saml-backend.repository.ts
    └── presentation/
        └── pages/
            ├── resources/          ← ResourcesComponent
            └── saml-response/      ← SamlResponseComponent
```

---

## 14. Dependencias y pendientes de confirmar con back/Citrix

| Pendiente | Impacto |
|---|---|
| ¿/authnRequest espera GET o POST? | Determina mecanismo de la llamada 2 (window.location vs formulario) |
| Nombre/URL exacta de la ACS URL de NetScaler | Necesario para la llamada 5 |
| URL de retorno tras validación en NetScaler | Necesario para saber dónde retoma Angular antes de la llamada 6 |
| ACS URL de NEO registrada en PingAM IDP profile | Bloquea la llamada 4 — PingAM no sabe dónde enviar el formulario |
| ACS URL de NEO en config de Shell | Bloquea routing de Angular |
| FQDN definitivo VS ADC de NEO | Determina SameSite de cookies |

---

## 15. Notas técnicas adicionales

**Sobre FAS y el UPN:** FAS mapea la identidad SAML a un certificado Windows usando el UPN del usuario. El UPN debe viajar en el `saml:subject` de la aserción emitida por PingAM. La fuente de verdad del UPN es ADGBS.com (Active Directory).

**Sobre la Citrix Session Cookie y el streaming:** una vez obtenida la cookie, el sub-paquete Citrix Utils de Proteo4 la usa implícitamente (vía el navegador) al invocar el Citrix Workspace App SDK para iniciar el canal de streaming HDX/SSE hacia el VDA donde corre Eclipse Lite.

**Sobre las dos ACS URLs (recordatorio):** la ACS URL de NEO es donde PingAM manda la SAML Response al front (llamada 4). La ACS URL de NetScaler es donde el front manda la SAML Response al SP (llamada 5). Son distintas y deben estar correctamente configuradas en PingAM, NetScaler y la Shell de NEO.

**Analogía con el flujo OAuth:** el mecanismo de "Angular abandona el contexto → el navegador navega a un dominio externo → vuelve a una ruta de NEO → Angular arranca de nuevo" es idéntico al del flujo OAuth con Entra ID. La diferencia es que en OAuth el retorno es un redirect a `/token?code=...` y en SAML es un formulario auto-enviado a la ACS URL de NEO.

---

## 16. POC local en Shell NEO

La POC local ejecuta el flujo completo desde la shell:

- Shell host: `http://localhost:4300`
- Login MFE: `http://localhost:4500`
- Mock PingAM: `http://localhost:8081`
- Mock Citrix/NetScaler: `http://localhost:8082`

### Routing local

La shell expone rutas federadas para:

- `/saml/resources` → `ResourcesComponent`
- `/saml/acs` → `SamlResponseComponent`
- `/login` → `LoginComponent`
- `/authorize` → `AuthorizeComponent`
- `/token` → `GetTokensComponent`

Cuando `/resources` responde `200`, el payload `{ resources: [...] }` se publica mediante el EventBus y la shell actualiza el menú lateral. Las rutas mockeadas de recursos se normalizan visualmente a:

- `/workspace`
- `/aplicaciones`
- `/escritorios`

### Panel lateral de flujo

Para demo y validación funcional se añadió un panel derecho en la shell:

- Escucha eventos `neoFlowStep`.
- Acumula los pasos de OAuth y SAML.
- Cada tarjeta muestra un mini-diagrama secuencial con actores, request y response.
- El flujo avanza manualmente con `Siguiente`, sin bloquear la pantalla con modales.

### Consideración de UX

Los modales originales siguen documentados conceptualmente como puntos de confirmación, pero para la POC se sustituyen por tarjetas accionables. Esto permite ver simultáneamente:

- menú/recursos,
- pantalla central,
- evolución técnica del flujo en back.
