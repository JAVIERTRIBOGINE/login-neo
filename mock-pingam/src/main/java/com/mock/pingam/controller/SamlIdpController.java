package com.mock.pingam.controller;

import com.mock.pingam.store.PingamSessionStore;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
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

    @Value("${mock.pingam.neo-login-url}")
    private String neoLoginUrl;

    public SamlIdpController(PingamSessionStore store) {
        this.store = store;
    }

    @GetMapping("/SSORedirect")
    public ResponseEntity<String> ssoRedirect(@RequestParam(required = false) String SAMLRequest,
                                                @RequestParam(required = false) String RelayState,
                                                HttpServletRequest request) {
        String ssoCookie = readCookie(request, ssoCookieName);

        if (ssoCookie == null || !store.tokenIdToUpn.containsKey(ssoCookie)) {
            // Sin sesión PingAM se devuelve el control al flujo OAuth del Login MFE.
            return ResponseEntity.status(HttpStatus.SEE_OTHER)
                    .header(HttpHeaders.LOCATION, neoLoginUrl)
                    .build();
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
