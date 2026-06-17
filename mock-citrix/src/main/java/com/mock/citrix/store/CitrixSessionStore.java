package com.mock.citrix.store;

import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Estado en memoria del mock de Citrix ADC/NetScaler + StoreFront.
 * Sustituye a la Citrix Session Cookie real (NSC_TMAA / NSC_TMAS) -- ver
 * context-SAML.md secc. 10.
 */
@Component
public class CitrixSessionStore {

    /** Valores de cookie de sesión Citrix considerados válidos. */
    public final Set<String> validSessions = ConcurrentHashMap.newKeySet();

    /** RelayState emitidos en /authnRequest, para correlación opcional. */
    public final Set<String> issuedRelayStates = ConcurrentHashMap.newKeySet();
}
