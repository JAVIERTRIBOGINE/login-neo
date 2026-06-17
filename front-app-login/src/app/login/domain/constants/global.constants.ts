import { InjectionToken } from "@angular/core";
import { TLinkName, TStep, TTealiumEventDataLogin, TTeliumTraceDataLogin } from "../models/tealium.model";
import { AuthConfig, AuthorizeRequest, AuthorizeResponse, DataManagerResponse, TokensRequest, TokensResponse } from "@proteo/types";

export type tEnvName = "local" | "int" | "pre"

export const TitleNameLink = "click_cta";

export const CURRENT_URL = window.location.href;

export const LINK_NAMES: {[key: string]: TLinkName} = {
    OPERATIVA_INICIO: 'operativa_inicio',
    OPERATIVA_CLAVE: 'operativa_clave',
    OPERATIVA_CONFIRMACION: 'operativa_confirmacion',
}

export const STEPS: {[key: string]: TStep} = {
    INICIO: 'inicio',
    FIRMA: 'firma',
    CONFIRMACION: 'confirmacion',
}

export const OP_STEPS: {[key: string]: TStep} = {
    INICIO: 'inicio',
    FIRMA: 'firma',
    CONFIRMACION: 'confirmacion',
}


export const TeliumTraceDataLogin: TTeliumTraceDataLogin = {
    ENTORNO: 'privada',
    CANAL: 'oficina remota',
    CATEGORIA: {
        PAGINA: 'operativa:servicing',
        PRODUCTO: '',
    },
    NOMBRE_PRODUCTO: '',
    NOMBRE_OPERATIVA: 'clientes sin bdis error',
    NOMBRE_LINK: LINK_NAMES['OPERATIVA_INICIO'],
    NIVEL: {
        UNO: 'particulares',
        DOS: 'clientes sin bdis',
        TRES: 'login'},

    PASO_OPERATIVA: OP_STEPS['INICIO'],
    PASO: STEPS['INICIO']
}

export const TealiumEventDataLogin: TTealiumEventDataLogin = {
    PREFIX: "cta-enlace",
    TITLE: 'login sin contrasenya',
    ACTION: {
        HELP: "solicitar ayuda"
    }
}

export const PROCEDENCE_DEFAULT = "IE31";
export const CHANEL_DEFAULT = "UNDEFINED_CHANNEL";

export const INITIALIZE_FN: InjectionToken<(authConfig: AuthConfig) => void> = new InjectionToken("INITIALIZE_FN")

export const GET_TOKENS_FN: InjectionToken<(url: string, tokenId: string, request: TokensRequest) => Promise<DataManagerResponse<TokensResponse>>> =
new InjectionToken("GET_TOKENS_FN");

export const AUTHORIZE_FN: InjectionToken<(request: AuthorizeRequest) => Promise<DataManagerResponse<AuthorizeResponse>>> = new InjectionToken("AUTHORIZE_FN")

export const END_SESSION_FN: InjectionToken<(clientId: string, driver: string) => Promise<void>> = new InjectionToken("END_SESSION_FN")

export const REVOKE_FN: InjectionToken<(clientId: string, driver: string) => Promise<void>> = new InjectionToken("REVOKE_FN");
