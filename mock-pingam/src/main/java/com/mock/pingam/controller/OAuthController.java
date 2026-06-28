package com.mock.pingam.controller;

import com.mock.pingam.store.PingamSessionStore;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.nio.charset.StandardCharsets;

/**
 * Mock de los endpoints OAuth2/OIDC de PingAM (CONTEXT.md secc. 3, Fase 1).
 *
 * - POST /oauth2/authorize: requiere SSO Cookie + csrf (tokenId emitido en /authenticate).
 *   Responde 302 hacia redirectUri con ?code=&state=.
 * - POST /oauth2/token: intercambia code+state por access_token/id_token.
 */
@RestController
@RequestMapping("/digital/party-authentication/v4/oauth2")
public class OAuthController {

    private final PingamSessionStore store;

    public OAuthController(PingamSessionStore store) {
        this.store = store;
    }

    @PostMapping("/authorize")
    public ResponseEntity<?> authorize(HttpServletRequest request) {
        String csrf = firstNonBlank(request.getParameter("csrf"), request.getParameter("assertion"));
        String redirectUri = firstNonBlank(request.getParameter("redirect_uri"), request.getParameter("redirectUri"));
        String requestedState = request.getParameter("state");
        String ssoCookie = readCookie(request, "PA_SSO");

        if (csrf == null || csrf.isBlank() || ssoCookie == null
                || !store.tokenIdToUpn.containsKey(csrf) || !csrf.equals(ssoCookie)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (redirectUri == null || redirectUri.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        String code = "mock-code-" + UUID.randomUUID();
        String state = requestedState == null || requestedState.isBlank() ? UUID.randomUUID().toString() : requestedState;
        store.codeToTokenId.put(code, csrf);

        String location = redirectUri + (redirectUri.contains("?") ? "&" : "?")
                + "code=" + code + "&state=" + state;

        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, location)
                .build();
    }

    @PostMapping("/token")
    public ResponseEntity<Map<String, Object>> token(@RequestBody Map<String, Object> body,
                                                       @RequestHeader(value = "Authorization", required = false) String authorization,
                                                       HttpServletResponse response) {
        String code = (String) body.get("code");
        String tokenId = store.codeToTokenId.get(code);

        if (tokenId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String upn = store.tokenIdToUpn.get(tokenId);

        String accessToken = fakeJwt(Map.of("sub", upn, "scope", "openid", "roles", "GESTOR", "type", "access"));
        String idToken = fakeJwt(Map.of("sub", upn, "upn", upn, "type", "id"));

        // Refresca la SSO Cookie (efecto colateral del flujo, ver CONTEXT.md secc. 3)
        response.addHeader("Set-Cookie", "PA_SSO=" + tokenId + "; Path=/; HttpOnly; SameSite=Lax");

        Map<String, Object> tokens = new LinkedHashMap<>();
        tokens.put("access_token", accessToken);
        tokens.put("id_token", idToken);
        return ResponseEntity.ok(tokens);
    }

    /** Genera un JWT "de mentira": header.payload.signature en base64, sin firma real. */
    private String fakeJwt(Map<String, Object> claims) {
        String header = base64(Map.of("alg", "none", "typ", "JWT"));
        String payload = base64(claims);
        return header + "." + payload + ".mock-signature";
    }

    private String base64(Map<String, Object> map) {
        StringBuilder json = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, Object> e : map.entrySet()) {
            if (!first) json.append(",");
            first = false;
            json.append("\"").append(e.getKey()).append("\":\"").append(e.getValue()).append("\"");
        }
        json.append("}");
        return Base64.getUrlEncoder().withoutPadding().encodeToString(json.toString().getBytes(StandardCharsets.UTF_8));
    }

    private String readCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        for (var cookie : request.getCookies()) {
            if (name.equals(cookie.getName())) return cookie.getValue();
        }
        return null;
    }

    private String firstNonBlank(String first, String second) {
        return first != null && !first.isBlank() ? first : second;
    }
}
