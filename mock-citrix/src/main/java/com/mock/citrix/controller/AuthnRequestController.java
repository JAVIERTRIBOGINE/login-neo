// Indica la carpeta Java a la que pertenece esta clase.
package com.mock.citrix.controller;

// Permite usar el lugar donde Citrix guarda los datos temporales de cada acceso.
import com.mock.citrix.store.CitrixSessionStore;
// Permite leer un valor escrito en la configuración de la aplicación.
import org.springframework.beans.factory.annotation.Value;
// Ofrece nombres ya preparados para las cabeceras de una respuesta web.
import org.springframework.http.HttpHeaders;
// Ofrece nombres ya preparados para los códigos de respuesta web.
import org.springframework.http.HttpStatus;
// Representa la respuesta que se enviará al navegador.
import org.springframework.http.ResponseEntity;
// Permite indicar qué dirección atiende un método cuando llega una petición GET.
import org.springframework.web.bind.annotation.GetMapping;
// Permite indicar que esta clase recibe peticiones web.
import org.springframework.web.bind.annotation.RestController;

// Permite convertir texto usando la codificación habitual UTF-8.
import java.nio.charset.StandardCharsets;
// Permite transformar texto a Base64.
import java.util.Base64;
// Permite crear identificadores únicos al azar.
import java.util.UUID;

/**
 * Recibe el comienzo de un acceso y prepara el salto desde Citrix hasta PingAM.
 *
 * En este ejemplo, Citrix inventa una petición SAML sencilla y un RelayState.
 * Después manda ambos valores a PingAM para que el proceso de acceso continúe.
 */
// Le dice a Spring que esta clase se encarga de responder a peticiones web.
@RestController
// Declara la clase que gestiona el comienzo de la petición de acceso.
public class AuthnRequestController {

    // Guarda una referencia al almacén compartido de sesiones de Citrix.
    private final CitrixSessionStore store;

    // Toma de la configuración la dirección a la que hay que enviar la petición.
    @Value("${mock.citrix.pingam-sso-url}")
    // Conserva la dirección de PingAM para usarla cuando llegue una petición.
    private String pingamSsoUrl;

    // Recibe el almacén de sesiones cuando Spring crea este controlador.
    public AuthnRequestController(CitrixSessionStore store) {
        // Guarda el almacén recibido para poder utilizarlo más adelante.
        this.store = store;
    // Termina la preparación inicial del controlador.
    }

    // Indica que este método responde a una visita a /authnRequest.
    @GetMapping("/authnRequest")
    // Inicia la petición y devuelve una respuesta sin contenido propio.
    public ResponseEntity<Void> authnRequest() {
        // Crea un RelayState nuevo para reconocer este intento de acceso.
        String relayState = UUID.randomUUID().toString();
        // Guarda el RelayState para poder comprobarlo cuando vuelva de PingAM.
        store.issuedRelayStates.add(relayState);

        // Crea el texto que hará de petición SAML en este proyecto de prueba.
        String samlRequest = Base64.getEncoder().encodeToString(
                // Añade un identificador único y convierte el resultado en bytes UTF-8.
                ("mock-authn-request-" + UUID.randomUUID()).getBytes(StandardCharsets.UTF_8));

        // Une la dirección de PingAM con la petición SAML y el RelayState.
        String location = pingamSsoUrl + "?SAMLRequest=" + samlRequest + "&RelayState=" + relayState;

        // Prepara una respuesta 302 para indicar al navegador que debe ir a otra dirección.
        return ResponseEntity.status(HttpStatus.FOUND)
                // Añade a la respuesta la dirección completa de PingAM.
                .header(HttpHeaders.LOCATION, location)
                // Da por terminada la respuesta, sin añadir contenido a su cuerpo.
                .build();
    // Termina el trabajo que se hace al visitar /authnRequest.
    }
// Termina la clase del controlador.
}
