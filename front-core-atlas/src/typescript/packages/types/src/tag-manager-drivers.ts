import type { TagRequestOptions } from './tag-manager.js';

/**
 * Available drivers constants
 */
export type TM_AVAILABLE_DRIVERS = 'TX' | 'INFO' | 'TXP4';

/**
 * Tealium options
 */
export interface TealiumOptions extends TagRequestOptions {
  bicFrom?: string;
  bicTo?: string;
}

/**
 * Tag Manager Input Data interface
 */
export interface TagManagerInputData {
  [clave: string]: unknown;
}

/**
 * Tealium Data interface
 */
export interface TealiumData extends MandatoryFields {
  acceso?: string;
  actividadLoginLogout?: string;
  bancoDestino?: string;
  BSPersonalizacion?: string;
  canal?: string;
  categoriaPagina?: string;
  categoriaProducto?: string;
  chatActivo?: string;
  codigoOperacion?: string;
  cuentaDestino?: string;
  cuentaOrigen?: string;
  divisa?: string;
  divisaAsegurar?: string;
  divisaContrapartida?: string;
  docLoginEmpresa?: string;
  entorno?: string;
  errorCode?: string;
  errorDescription?: string;
  errorPage?: string;
  errorType?: string;
  fechaAlta?: string;
  fechaNacimiento?: string;
  formError?: string;
  formStatus?: string;
  ibanOrigen?: string;
  ibanDestino?: string;
  idCliente?: string;
  idioma?: string;
  idPagina?: string;
  idUser?: string;
  idUsuarioAutorizado?: string;
  importe?: string;
  localidadCodigoPostal?: string;
  modulosBienvenida?: string;
  nivel1?: string;
  nivel2?: string;
  nivel3?: string;
  nivel4?: string;
  nivel5?: string;
  nivel6?: string;
  nivel7?: string;
  nivel8?: string;
  nivel9?: string;
  nombreLink?: string;
  nombreProducto?: string;
  nombreSearch?: string;
  numTarjeta?: string;
  oficinaAsignada?: string;
  oficinaGestora?: string;
  operationId?: string;
  operationSubId?: string;
  paisBenef?: string;
  razonSocial?: string;
  regionCliente?: string;
  resultadoSearch?: string;
  rolUserEmpresa?: string;
  searchKeyword?: string;
  segmentoComercial?: string;
  segmentoCorp?: string;
  segmentoEstrategico?: string;
  sessionId?: string;
  subsegmentoComercial?: string;
  subsegmentoCorp?: string;
  tipoImpuesto?: string;
  tipoOperacion?: string;
  tipoSearch?: string;
  tipoUser?: string;
  valoracionOperativa?: string;
  versionDL?: string;
  paso?: string;
}

export interface MandatoryFields {
  esProceso: string;
  pasoOperativa: string;
  nombreOperativa: string;
}

export interface EventInfo {
  event?: string;
  click_cta_info?: string;
  actividad?: Actividad;
  form?: Form;
  busqueda?: Busqueda;
  deeplink?: Deeplink;
  error?: Error;
  info_ic?: string;
  info?: string;
  event_label?: string;
  icimpressions_info?: string;
  info_pasos?: number;
}

export interface Actividad {
  actividadLoginLogout?: string;
}

export interface Busqueda {
  nombreSearch?: string;
  resultadoSearch?: string;
  searchKeyword?: string;
  tipoSearch?: string;
}

export interface Deeplink {
  deep_link_url?: string;
  deep_link_origin?: string;
}

export interface Error {
  errorCode?: string;
  errorDescription?: string;
  errorPage?: string;
  errorType?: string;
}

export interface Form {
  formError?: string;
  formStatus?: string;
}

export interface GlobalInfo {
  app?: App;
  device?: Device;
  area?: Area;
  consent?: Consent;
}

export interface App {
  appName?: string;
  appId?: string;
  appBuild?: string;
}

export interface Area {
  activoDigital?: string;
}

export interface Consent {
  consentCategories?: Record<string, boolean>;
}

export interface Device {
  model?: string;
  operatingSystem?: string;
  advertisingId?: string;
}

export interface PageInfo {
  screenName?: string;
  pagina?: Pagina;
  prod?: Prod;
  operativa?: Operativa;
}

export interface Operativa {
  bancoDestino?: string;
  codigoOperacion?: string;
  cuentaDestino?: string;
  cuentaOrigen?: string;
  divisa?: string;
  divisaAsegurar?: string;
  divisaContrapartida?: string;
  ibanDestino?: string;
  importe?: string;
  nombreOperativa?: string;
  operationId?: string;
  operationSubId?: string;
  pasoOperativa?: string;
  tipoOperativa?: string;
  valoracionOperativa?: string;
  numTarjeta?: string;
  segmentoComercial?: string;
  segmentoCorp?: string;
  segmentoEstrategico?: string;
  subsegmentoComercial?: string;
  subsegmentoCorp?: string;
  tipoImpuesto?: string;
  idProceso?: string;
  icImpressions?: string;
  infoOperativa?: string;
  infoSimulacion?: string;
}

export interface Pagina {
  categoriaPagina?: string;
  chatActivo?: string;
  entorno?: string;
  idioma?: string;
  idPagina?: string;
  idContenidoExterno?: string;
  personalizacionProducto?: string;
  segmento?: string;
  tipoCliente?: string;
  versionCodigo?: string;
}

export interface Prod {
  categoriaProducto?: string;
  nivel1?: string;
  nivel2?: string;
  nivel3?: string;
  nivel4?: string;
  nivel5?: string;
  nivel6?: string;
  nivel7?: string;
  nivel8?: string;
  nivel9?: string;
  nombreProducto?: string;
  paso?: string;
  personalizacionProducto?: string;
}

export interface UserInfo {
  acceso?: string;
  BSPersonalizacion?: string;
  docLoginEmpresa?: string;
  estado?: string;
  fechaAlta?: string;
  fechaNacimiento?: string;
  numper?: string;
  idUser?: string;
  idUsuarioAutorizado?: string;
  localidadCodigoPostal?: string;
  modulosBienvenida?: string;
  oficinaAsignada?: string;
  oficinaGestora?: string;
  paisBenef?: string;
  personalizacionCliente?: string;
  razonSocial?: string;
  regionCliente?: string;
  rolUserEmpresa?: string;
  sessionId?: string;
  tipoUser?: string;
}

/**
 * Tealium TX-P4 data layer
 */
export interface DataLayerTXP4 {
  event?: string;
  globalInfo?: {
    app?: {
      appName?: string;
      appId?: string;
      appBuild?: string;
      [key: string]: unknown;
    };
    device?: {
      model?: string;
      operatingSystem?: string;
      advertisingId?: string;
      [key: string]: unknown;
    };
    area?: {
      activoDigital?: 'bso' | 'bsm';
      [key: string]: unknown;
    };
    consent?: {
      consentCategories?: string;
      [key: string]: unknown;
    };
    acceso?: string;
    [key: string]: unknown;
  };
  userInfo?: {
    numper?: string;
    adobe_mc?: string;
    saldo_total?: string;
    divisa_saldoTotal?: string;
    estado?: 'conectado' | 'no conectado';
    bizumActivo?: unknown;
    infoProducto?: {
      numero_de_cuentas?: number;
      numero_de_tarjetas_de_debito?: number;
      numero_de_tarjetas_de_credito?: number;
      numero_de_prestamos?: number;
      numero_de_creditos?: number;
      numero_seguros?: number;
      numero_de_productos_ahorro?: number;
      numero_de_productos_de_inversion?: number;
      numero_de_hipotecas?: number;
      numero_de_autorenting?: number;
      [key: string]: unknown;
    };
    infoCliente?: {
      cliente_digital?: unknown;
      multidivisa?: 1 | 'z';
      saldoprevio_existente?: 1 | 'z';
      [key: string]: unknown;
    };
    infoApp?: {
      modo_incognito?: 1 | 'z';
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  pageInfo?: {
    screenName?: string;
    isIframe?: boolean;
    pagina?: {
      categoriaPagina?: string;
      entorno?: 'privada' | 'informacional';
      idioma?: string;
      idPagina?: string;
      idContenidoExterno?: string;
      modulos?: string[];
      modulosTotales?: number;
      moduloNombre?: string;
      [key: string]: unknown;
    };
    prod?: {
      categoriaProducto?: string;
      nombreProducto?: string;
      nivel1?: string;
      nivel2?: string;
      nivel3?: string;
      nivel4?: string;
      nivel5?: string;
      nivel6?: string;
      nivel7?: string;
      nivel8?: string;
      nivel9?: string;
      personalizacionProducto?: string;
      [key: string]: unknown;
    };
    operativa?: {
      codigoOperacion?: string;
      divisa?: string;
      divisaAsegurar?: string;
      nombreOperativa?: string;
      operationId?: string;
      operationSubId?: string;
      pasoOperativa?: string;
      tipoOperativa?: string;
      segmentoComercial?: string;
      segmentoCorp?: string;
      segmentoEstrategico?: string;
      subsegmentoComercial?: string;
      subsegmentoCorp?: string;
      tipoImpuesto?: string;
      idProceso?: string;
      icImpressions?: string;
      infoOperativa?: string;
      infoSimulacion?: string;
      modoMovimientos?: 'activado' | 'desactivado';
      [key: string]: unknown;
    };
    error?: {
      errorType?: string;
      errorDescription?: string;
      errorCode?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  eventInfo?: {
    event?: string;
    info?: string;
    info_pasos?: string;
    event_label?: string;
    icimpressions_info?: string;
    info_ic?: string;
    form?: {
      formError?: string;
      formStatus?: string;
      [key: string]: unknown;
    };
    deeplink?: {
      deep_link_url?: string;
      deep_link_origin?: string;
      [key: string]: unknown;
    };
    error?: {
      errorCode?: string;
      errorDescription?: string;
      errorPage?: string;
      errorType?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
