package com.mock.pingam.controller;

import com.mock.pingam.store.PingamSessionStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

/**
 * Adaptador ACS para aplicaciones SPA. Recibe el Form POST del navegador,
 * conserva el payload bajo un id efímero y redirige a una ruta Angular.
 */
@RestController
public class SamlAcsController {

    private final PingamSessionStore store;

    @Value("${mock.pingam.neo-acs-return-url}")
    private String neoAcsReturnUrl;

    public SamlAcsController(PingamSessionStore store) {
        this.store = store;
    }

    @PostMapping(value = "/saml/acs", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<Void> receive(@RequestParam("SAMLResponse") String samlResponse,
                                        @RequestParam(value = "RelayState", defaultValue = "") String relayState) {
        String responseId = UUID.randomUUID().toString();
        store.samlAcsResponses.put(responseId, Map.of(
                "samlResponse", samlResponse,
                "relayState", relayState
        ));

        String location = neoAcsReturnUrl + "?responseId="
                + URLEncoder.encode(responseId, StandardCharsets.UTF_8);
        return ResponseEntity.status(HttpStatus.SEE_OTHER)
                .header(HttpHeaders.LOCATION, location)
                .build();
    }

    @GetMapping("/saml/acs-response/{responseId}")
    public ResponseEntity<Map<String, String>> consume(@PathVariable String responseId) {
        Map<String, String> response = store.samlAcsResponses.remove(responseId);
        return response == null
                ? ResponseEntity.notFound().build()
                : ResponseEntity.ok(response);
    }
}
