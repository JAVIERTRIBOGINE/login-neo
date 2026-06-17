package com.mock.citrix.controller;

import com.mock.citrix.store.CitrixSessionStore;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Mock de GET /resources (StoreFront) -- llamadas 1 y 6 de context-SAML.md secc. 4.
 *
 * - 200 OK si la Citrix Session Cookie es válida (Caso 4 / tras llamada 5)
 * - 401 si no existe o no es válida -> dispara el flujo SAML completo
 */
@RestController
public class ResourcesController {

    private final CitrixSessionStore store;

    @Value("${mock.citrix.session-cookie-name}")
    private String sessionCookieName;

    public ResourcesController(CitrixSessionStore store) {
        this.store = store;
    }

    @GetMapping("/resources")
    public ResponseEntity<Map<String, Object>> getResources(HttpServletRequest request) {
        String session = readCookie(request, sessionCookieName);
        String ssoSession = readCookie(request, "PA_SSO");

        if ((session == null || !store.validSessions.contains(session))
                && (ssoSession == null || !ssoSession.startsWith("mock-token-"))) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Map<String, Object> body = Map.of(
                "resources", List.of(
                        Map.of("path", "/workspace", "label", "Workspace", "icon", "home"),
                        Map.of("path", "/applications", "label", "Aplicaciones", "icon", "apps"),
                        Map.of("path", "/desktops", "label", "Escritorios", "icon", "desktop")
                )
        );
        return ResponseEntity.ok(body);
    }

    private String readCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        for (var cookie : request.getCookies()) {
            if (name.equals(cookie.getName())) return cookie.getValue();
        }
        return null;
    }
}
