package com.mock.pingam.controller;

import com.mock.pingam.store.PingamSessionStore;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * Mock simplificado del árbol de autenticación PingAM (POST /authenticate).
 * Ver CONTEXT.md secc. 15.
 *
 * Simula el árbol completo de la POC:
 * 1. Devuelve RedirectCallback para que el navegador salga hacia Entra ID/PingAM.
 * 2. /mock-entra-id simula error Entra ID y Kerberos internamente.
 * 3. Redirige a Angular /login?authId=...
 * 4. Angular retoma el árbol con authId y recibe NameCallback + PasswordCallback.
 *
 * Llamada 1 (sin authId)             -> RedirectCallback
 * Navegación externa                 -> 303 /login?authId=...
 * Llamada 2 (authId sin credenciales)-> NameCallback + PasswordCallback
 * Llamada 3 (authId+creds)           -> ISuccessOtpRespone + Set-Cookie SSO
 */
@RestController
public class AuthenticateController {

    private static final String MOCK_USERNAME = "43734794H";
    private static final String MOCK_PASSWORD = "2026";

    private final PingamSessionStore store;

    @Value("${mock.pingam.sso-cookie-name}")
    private String ssoCookieName;

    @Value("${mock.pingam.neo-auth-resume-url}")
    private String defaultNeoAuthResumeUrl;

    public AuthenticateController(PingamSessionStore store) {
        this.store = store;
    }

    @PostMapping({
            "/digital/party-authentication/v4/light-users/authenticate",
            "/digital/party-authentication/v4/employees/authenticate"
    })
    public ResponseEntity<Map<String, Object>> authenticate(@RequestBody(required = false) Map<String, Object> body,
                                                              HttpServletRequest request,
                                                              HttpServletResponse response) {
        String authId = body == null ? null : (String) body.get("authId");

        if (authId == null || authId.isBlank()) {
            return ResponseEntity.ok(startTree(request));
        }

        String stage = store.authTrees.get(authId);
        if (stage == null) {
            // authId desconocido -> el árbol se reinicia (ver CONTEXT.md secc. 15, "authId")
            return ResponseEntity.ok(startTree(request));
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> callbacks = (List<Map<String, Object>>) body.getOrDefault("callbacks", List.of());

        String username = extractIdToken(callbacks, "NameCallback", "IDToken1");
        String password = extractIdToken(callbacks, "PasswordCallback", "IDToken2");

        if (username == null && password == null) {
            if ("AWAITING_ENTRA_ID".equals(stage)) {
                store.authTrees.put(authId, "AWAITING_CREDENTIALS");
                return ResponseEntity.ok(credentialsCallbacks(authId));
            }

            return ResponseEntity.ok(credentialsCallbacks(authId));
        }

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

    @GetMapping("/mock-entra-id")
    public ResponseEntity<Void> mockEntraId(@RequestParam String authId,
                                            @RequestParam(required = false) String returnUrl) {
        if (store.authTrees.containsKey(authId)) {
            store.authTrees.put(authId, "AWAITING_CREDENTIALS");
        }

        String resolvedReturnUrl = returnUrl == null || returnUrl.isBlank() ? defaultNeoAuthResumeUrl : returnUrl;
        String separator = resolvedReturnUrl.contains("?") ? "&" : "?";
        String location = resolvedReturnUrl
                + separator
                + "authId="
                + URLEncoder.encode(authId, StandardCharsets.UTF_8);

        return ResponseEntity.status(HttpStatus.SEE_OTHER)
                .header(HttpHeaders.LOCATION, location)
                .build();
    }

    private Map<String, Object> startTree(HttpServletRequest request) {
        String authId = "mock-authid-" + UUID.randomUUID();
        store.authTrees.put(authId, "AWAITING_ENTRA_ID");

        String returnUrl = resolveNeoLoginUrl(request);
        String redirectUrl = "http://localhost:8081/mock-entra-id"
                + "?authId=" + URLEncoder.encode(authId, StandardCharsets.UTF_8)
                + "&returnUrl=" + URLEncoder.encode(returnUrl, StandardCharsets.UTF_8);

        Map<String, Object> redirectCallback = new LinkedHashMap<>();
        redirectCallback.put("type", "RedirectCallback");
        redirectCallback.put("output", List.of(
                Map.of("name", "redirectUrl", "value", redirectUrl),
                Map.of("name", "redirectMethod", "value", "GET")
        ));
        redirectCallback.put("input", List.of(Map.of("name", "IDToken1", "value", "")));

        Map<String, Object> tree = new LinkedHashMap<>();
        tree.put("authId", authId);
        tree.put("callbacks", List.of(redirectCallback));
        return tree;
    }

    private Map<String, Object> credentialsCallbacks(String authId) {
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

    private String resolveNeoLoginUrl(HttpServletRequest request) {
        String origin = request.getHeader("Referer");
        if (origin == null || origin.isBlank()) {
            origin = request.getHeader("Origin");
        }
        if (origin == null || origin.isBlank()) {
            return defaultNeoAuthResumeUrl;
        }

        try {
            var uri = java.net.URI.create(origin);
            return uri.getScheme() + "://" + uri.getAuthority() + "/login";
        } catch (IllegalArgumentException ignored) {
            return defaultNeoAuthResumeUrl;
        }
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
