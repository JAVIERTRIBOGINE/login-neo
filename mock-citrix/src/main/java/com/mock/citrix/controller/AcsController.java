package com.mock.citrix.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mock.citrix.store.CitrixSessionStore;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

/**
 * Mock de la llamada 5 (context-SAML.md secc. 4): POST ACS URL de NetScaler
 * (/validateSAMLResponse).
 *
 * Recibe la "SAML Response" (formulario construido por SamlResponseComponent,
 * sin CORS) generada por mock-pingam, "valida" su firma (en este mock: decodifica
 * el JSON base64 y comprueba issuer/audience/expiración), emite la Citrix Session
 * Cookie (HttpOnly) y redirige (302) de vuelta a NEO -- llamada 6.
 */
@RestController
public class AcsController {

    private final CitrixSessionStore store;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${mock.citrix.session-cookie-name}")
    private String sessionCookieName;

    @Value("${mock.citrix.return-url}")
    private String returnUrl;

    public AcsController(CitrixSessionStore store) {
        this.store = store;
    }

    @PostMapping(value = "/validateSAMLResponse", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<Void> validateSamlResponse(@RequestParam("SAMLResponse") String samlResponse,
                                                       @RequestParam(value = "RelayState", required = false) String relayState,
                                                       HttpServletResponse response) {
        try {
            String json = new String(Base64.getDecoder().decode(samlResponse), StandardCharsets.UTF_8);
            JsonNode node = objectMapper.readTree(json);

            String issuer = node.path("issuer").asText("");
            String audience = node.path("audience").asText("");
            Instant notOnOrAfter = Instant.parse(node.path("notOnOrAfter").asText());

            if (!"mock-pingam".equals(issuer) || !"mock-citrix".equals(audience)
                    || Instant.now().isAfter(notOnOrAfter)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        String sessionId = "mock-citrix-session-" + UUID.randomUUID();
        store.validSessions.add(sessionId);

        response.addHeader("Set-Cookie", sessionCookieName + "=" + sessionId + "; Path=/; HttpOnly; SameSite=Lax");

        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, returnUrl)
                .build();
    }
}
