package com.mock.pingam.store;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Estado en memoria del mock de PingAM. Sustituye al árbol de autenticación real
 * y a la sesión PingAM (SSO Cookie) -- ver CONTEXT.md secc. 2 y 15.
 */
@Component
public class PingamSessionStore {

    /** authId -> stage del árbol ("AWAITING_CREDENTIALS", "AUTHENTICATED") */
    public final Map<String, String> authTrees = new ConcurrentHashMap<>();

    /** tokenId (emitido en /authenticate, viaja como SSO Cookie y como csrf) -> UPN del usuario */
    public final Map<String, String> tokenIdToUpn = new ConcurrentHashMap<>();

    /** authorization code (emitido en /oauth2/authorize) -> tokenId asociado */
    public final Map<String, String> codeToTokenId = new ConcurrentHashMap<>();

    /** SSO Cookie value -> tokenId (mismo valor, se mantiene por claridad semántica) */
    public final Map<String, String> ssoCookieToTokenId = new ConcurrentHashMap<>();

    /** responseId -> campos del POST SAML, consumidos una sola vez por la ACS Angular. */
    public final Map<String, Map<String, String>> samlAcsResponses = new ConcurrentHashMap<>();
}
