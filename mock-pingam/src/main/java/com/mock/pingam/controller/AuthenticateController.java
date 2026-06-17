package com.mock.pingam.controller;

import com.mock.pingam.store.PingamSessionStore;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Mock simplificado del árbol de autenticación PingAM (POST /authenticate).
 * Ver CONTEXT.md secc. 15.
 *
 * Solo se simula el CASO 4 (usuario + contraseña), ya que los Casos 1-3
 * (federación Entra ID y Kerberos) dependen de infraestructura externa real
 * que no es viable reproducir en local. Solo se aceptan las credenciales mock
 * jtribo / Sabadell_26.
 *
 * Llamada 1 (sin authId)        -> NameCallback + PasswordCallback
 * Llamada 2 (con authId+creds)  -> ISuccessOtpRespone + Set-Cookie SSO
 */
@RestController
public class AuthenticateController {

    private static final String MOCK_USERNAME = "43734794H";
    private static final String MOCK_PASSWORD = "2026";

    private final PingamSessionStore store;

    @Value("${mock.pingam.sso-cookie-name}")
    private String ssoCookieName;

    public AuthenticateController(PingamSessionStore store) {
        this.store = store;
    }

    @PostMapping({
            "/digital/party-authentication/v4/light-users/authenticate",
            "/digital/party-authentication/v4/employees/authenticate"
    })
    public ResponseEntity<Map<String, Object>> authenticate(@RequestBody(required = false) Map<String, Object> body,
                                                              HttpServletResponse response) {
        String authId = body == null ? null : (String) body.get("authId");

        if (authId == null || authId.isBlank()) {
            return ResponseEntity.ok(startTree());
        }

        String stage = store.authTrees.get(authId);
        if (stage == null) {
            // authId desconocido -> el árbol se reinicia (ver CONTEXT.md secc. 15, "authId")
            return ResponseEntity.ok(startTree());
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> callbacks = (List<Map<String, Object>>) body.getOrDefault("callbacks", List.of());

        String username = extractIdToken(callbacks, "NameCallback", "IDToken1");
        String password = extractIdToken(callbacks, "PasswordCallback", "IDToken2");

        if (!MOCK_USERNAME.equals(username) || !MOCK_PASSWORD.equals(password)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Credenciales mock validadas.
        String tokenId = "mock-token-" + UUID.randomUUID();
        store.authTrees.put(authId, "AUTHENTICATED");
        store.tokenIdToUpn.put(tokenId, username.contains("@") ? username : username + "@adgbs.com");
        store.ssoCookieToTokenId.put(tokenId, tokenId);

        Cookie ssoCookie = new Cookie(ssoCookieName, tokenId);
        ssoCookie.setHttpOnly(true);
        ssoCookie.setPath("/");
        ssoCookie.setMaxAge(60 * 60);
        response.addCookie(ssoCookie);
        response.addHeader("Set-Cookie", ssoCookieName + "=" + tokenId + "; Path=/; HttpOnly; SameSite=Lax");

        Map<String, Object> success = new LinkedHashMap<>();
        success.put("successUrl", "/dashboard");
        success.put("tokenId", tokenId);
        success.put("realm", "/");
        return ResponseEntity.ok(success);
    }

    private Map<String, Object> startTree() {
        String authId = "mock-authid-" + UUID.randomUUID();
        store.authTrees.put(authId, "AWAITING_CREDENTIALS");

        Map<String, Object> nameCallback = new LinkedHashMap<>();
        nameCallback.put("type", "NameCallback");
        nameCallback.put("output", List.of(Map.of("name", "prompt", "value", "User Name")));
        nameCallback.put("input", List.of(Map.of("name", "IDToken1", "value", "")));

        Map<String, Object> passwordCallback = new LinkedHashMap<>();
        passwordCallback.put("type", "PasswordCallback");
        passwordCallback.put("output", List.of(Map.of("name", "prompt", "value", "Password")));
        passwordCallback.put("input", List.of(Map.of("name", "IDToken2", "value", "")));

        Map<String, Object> tree = new LinkedHashMap<>();
        tree.put("authId", authId);
        tree.put("callbacks", List.of(nameCallback, passwordCallback));
        return tree;
    }

    private String extractIdToken(List<Map<String, Object>> callbacks, String type, String inputName) {
        for (Map<String, Object> cb : callbacks) {
            if (!type.equals(cb.get("type"))) continue;
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> inputs = (List<Map<String, Object>>) cb.getOrDefault("input", List.of());
            for (Map<String, Object> in : inputs) {
                if (inputName.equals(in.get("name"))) {
                    Object value = in.get("value");
                    return value == null ? null : value.toString();
                }
            }
        }
        return null;
    }
}
