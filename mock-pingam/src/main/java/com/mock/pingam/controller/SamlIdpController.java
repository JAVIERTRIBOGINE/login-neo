package com.mock.pingam.controller;

import com.mock.pingam.store.PingamSessionStore;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

/**
 * Mock del SSO endpoint de PingAM (IDP) -- llamada 3 de context-SAML.md.
 *
 * El navegador llega aquí siguiendo el 302 de NetScaler (no es una llamada XHR,
 * por eso no necesita CORS). Si la SSO Cookie es válida, PingAM devuelve un HTML
 * con un formulario auto-enviado (POST) hacia la ACS URL de NEO, igual que en el
 * flujo real (ver context-SAML.md secc. 4, llamada 3).
 *
 * NOTA: la "SAMLResponse" generada aquí NO es una aserción SAML real (no está
 * firmada ni es XML válido) -- es un JSON en base64 con los datos mínimos que
 * mock-citrix necesita para "validarla" en /validateSAMLResponse.
 */
@RestController
public class SamlIdpController {

    private final PingamSessionStore store;

    @Value("${mock.pingam.sso-cookie-name}")
    private String ssoCookieName;

    @Value("${mock.pingam.acs-neo-url}")
    private String acsNeoUrl;

    public SamlIdpController(PingamSessionStore store) {
        this.store = store;
    }

    @GetMapping("/SSORedirect")
    public ResponseEntity<String> ssoRedirect(@RequestParam(required = false) String SAMLRequest,
                                                @RequestParam(required = false) String RelayState,
                                                HttpServletRequest request) {
        String ssoCookie = readCookie(request, ssoCookieName);

        if (ssoCookie == null || !store.tokenIdToUpn.containsKey(ssoCookie)) {
            // Caso alternativo (context-SAML.md secc. 6): SSO Cookie inválida/ausente.
            // No se genera formulario -- el front debe interpretar esta página como
            // "sin SAMLResponse válida" y disparar saml:unauthorized.
            String html = """
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                      <meta charset="UTF-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <title>PingAM SSO session invalid</title>
                      <style>
                        :root {
                          color-scheme: light;
                          font-family: Arial, Helvetica, sans-serif;
                          color: #1f2937;
                          background: #f5f7fa;
                        }
                        body {
                          min-height: 100vh;
                          margin: 0;
                          display: grid;
                          place-items: center;
                        }
                        main {
                          width: min(440px, calc(100vw - 32px));
                          padding: 32px;
                          box-sizing: border-box;
                          border: 1px solid #d9e0e8;
                          border-radius: 8px;
                          background: #ffffff;
                          box-shadow: 0 12px 28px rgba(31, 41, 55, 0.12);
                          text-align: center;
                        }
                        .spinner {
                          width: 40px;
                          height: 40px;
                          margin: 0 auto 24px;
                          border: 4px solid #d9e0e8;
                          border-top-color: #005eb8;
                          border-radius: 50%;
                          animation: spin 0.9s linear infinite;
                        }
                        h3 {
                          margin: 0 0 12px;
                          font-size: 20px;
                          line-height: 1.3;
                        }
                        p {
                          margin: 0;
                          font-size: 15px;
                          line-height: 1.5;
                          color: #4b5563;
                        }
                        @keyframes spin {
                          to { transform: rotate(360deg); }
                        }
                      </style>
                    </head>
                    <body>
                      <main role="status" aria-live="polite">
                        <div class="spinner" aria-hidden="true"></div>
                        <h3>PingAM: SSO session invalid or expired</h3>
                        <p>No active SSO Cookie (%s). SAML flow cannot continue.</p>
                      </main>
                    </body>
                    </html>
                    """.formatted(ssoCookieName);
            return ResponseEntity.status(401).contentType(MediaType.TEXT_HTML).body(html);
        }

        String upn = store.tokenIdToUpn.get(ssoCookie);
        String samlResponse = buildMockSamlResponse(upn);
        String relayState = RelayState == null ? "" : RelayState;

        String html = "<!DOCTYPE html><html><body onload=\"document.forms[0].submit()\">"
                + "<form method=\"POST\" action=\"" + acsNeoUrl + "\">"
                + "<input type=\"hidden\" name=\"SAMLResponse\" value=\"" + samlResponse + "\"/>"
                + "<input type=\"hidden\" name=\"RelayState\" value=\"" + relayState + "\"/>"
                + "</form>"
                + "<noscript><button type=\"submit\">Continuar</button></noscript>"
                + "</body></html>";

        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(html);
    }

    private String buildMockSamlResponse(String upn) {
        Instant notOnOrAfter = Instant.now().plus(5, ChronoUnit.MINUTES);
        String json = "{"
                + "\"issuer\":\"mock-pingam\","
                + "\"audience\":\"mock-citrix\","
                + "\"subject\":\"" + upn + "\","
                + "\"notOnOrAfter\":\"" + notOnOrAfter + "\""
                + "}";
        return Base64.getEncoder().encodeToString(json.getBytes(StandardCharsets.UTF_8));
    }

    private String readCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        for (var cookie : request.getCookies()) {
            if (name.equals(cookie.getName())) return cookie.getValue();
        }
        return null;
    }
}
