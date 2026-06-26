
Tipo de componente 

Nombre del componente 

Alcance 

Descripción de su participación 

Diseño técnico 

Microfrontal / Aplicación Front 

Login MFE 

Nuevo 

Microfrontend responsable de disponibilizar los componentes Front necesarios para resolver los flujos de autenticación definidos. Expone las piezas asociadas a los flujos OAuth/OIDC y SAML. 

2.1.3.2 / 2.1.4.2 

Librería Front / Componente de arquitectura Proteo4 

AuthManager 

Nuevo 

Nueva pieza de la librería Proteo4 de responsable de coordinar los flujos de autenticación. Recibe la configuración proporcionada por la Shell, determina el flujo que debe ejecutarse en función del estado de sesión detectado y coordina la ejecución de los componentes OAuth/OIDC y SAML.  

2.1.3.2 / 2.1.4.2 

Componente Front 

GetAuthorizationRequestComponent 

Nuevo 

Componente responsable de iniciar el flujo SAML SP-Initiated solicitando a Citrix NetScaler la generación de la SAML Authentication Request. Gestiona el inicio de las redirecciones de navegador necesarias para abandonar temporalmente el contexto Angular y continuar el flujo contra PingAM. 

2.1.4.2 

Componente Front 

ACSComponent 

Nuevo 

Componente asociado a la ruta de retorno configurada para el flujo SAML. Recibe la respuesta del navegador tras la interacción con PingAM, recupera la información SAML necesaria y coordina el envío de la SAML Response hacia Citrix NetScaler para su validación. 

2.1.4.2 

Componente Front auxiliar 

SamlFormPostComponent 

Nuevo 

Componente auxiliar encargado de materializar los envíos de formulario necesarios durante el flujo SAML cuando el intercambio debe realizarse mediante navegación de navegador y no mediante llamadas XHR. Permite enviar la SAML Response al endpoint correspondiente evitando problemas de CORS y respetando el binding definido en el flujo. 

2.1.4.2 

Componente Front auxiliar 

RedirectHandlerComponent 

Nuevo 

Componente auxiliar encargado de gestionar redirecciones controladas dentro del flujo SAML, conservando la continuidad del proceso y permitiendo que Angular retome el control en las rutas acordadas entre Front, PingAM y Citrix NetScaler. 

2.1.4.2 

Componente Front 

OAuthCallbackComponent 

Nuevo 

Componente de callback del flujo OAuth/OIDC responsable de recibir el retorno desde PingAM tras la autenticación del usuario. Recupera los parámetros necesarios para completar el intercambio de código por tokens, valida el estado de la petición y notifica a AuthManager el resultado del proceso. 

2.1.3.2 

Componente Front 

CredentialsComponent 

Nuevo 

Componente visual utilizado únicamente como mecanismo de contingencia cuando PingAM no puede resolver la autenticación mediante Entra ID ni Kerberos. Permite recoger usuario y contraseña y enviarlos al árbol de autenticación de PingAM dentro del flujo definido. 

2.1.3.2 

Componente Front 

SamlResourcesComponent 

Nuevo 

Componente de entrada y reentrada del flujo SAML. Se encarga de solicitar los recursos Citrix mediante la llamada a las APIs de StoreFront. Si la respuesta es satisfactoria, notifica la disponibilidad de recursos y permite continuar con el proceso de streaming. Si recibe una respuesta Unauthorized, inicia la recuperación de sesión mediante el flujo SAML. Tras el retorno desde Citrix NetScaler, vuelve a ejecutar la solicitud de recursos para validar que la sesión Citrix ha sido emitida correctamente, dado que la cookie de sesión es HttpOnly y no puede ser inspeccionada directamente desde JavaScript. 

2.1.4.2 Diseño Implementación Front-End 

Componente Front auxiliar 

SamlFormComponent 

Nuevo 

Componente auxiliar responsable de construir y ejecutar los envíos de formulario requeridos durante el flujo SAML cuando el intercambio debe realizarse mediante navegación del navegador y no mediante llamadas XHR. Su función es materializar el envío de la SAML Response, junto con los parámetros necesarios del flujo, hacia el endpoint correspondiente de Citrix NetScaler, permitiendo respetar el binding definido y evitando dependencias de CORS propias de las llamadas realizadas desde JavaScript. 

2.1.4.2 Diseño Implementación Front-End 

