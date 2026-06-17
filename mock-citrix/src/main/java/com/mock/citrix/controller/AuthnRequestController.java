package com.mock.citrix.controller;

import com.mock.citrix.store.CitrixSessionStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;

/**
 * Mock de la llamada 2 (context-SAML.md secc. 4): GET /authnRequest.
 *
 * Es navegación del navegador (window.location.href), no XHR -- por eso no
 * necesita CORS. NetScaler genera la SAMLRequest + RelayState y redirige (302)
 * al SSO endpoint de PingAM.
 *
 * NOTA: la "SAMLRequest" es un placeholder en base64, no un AuthnRequest XML
 * firmado real -- mock-pingam no la valida, solo la propaga.
 */
@RestController
public class AuthnRequestController {

    private final CitrixSessionStore store;

    @Value("${mock.citrix.pingam-sso-url}")
    private String pingamSsoUrl;

    public AuthnRequestController(CitrixSessionStore store) {
        this.store = store;
    }

    @GetMapping("/authnRequest")
    public ResponseEntity<Void> authnRequest() {
        String relayState = UUID.randomUUID().toString();
        store.issuedRelayStates.add(relayState);

        String samlRequest = Base64.getEncoder().encodeToString(
                ("mock-authn-request-" + UUID.randomUUID()).getBytes(StandardCharsets.UTF_8));

        String location = pingamSsoUrl + "?SAMLRequest=" + samlRequest + "&RelayState=" + relayState;

        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, location)
                .build();
    }
}
