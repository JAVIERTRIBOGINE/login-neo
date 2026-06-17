export interface TTeliumTraceDataLogin {
    ENTORNO: string,
    CANAL: string,
    CATEGORIA: TTeliumTraceDataLoginCategory,
    NOMBRE_PRODUCTO: string,
    NOMBRE_OPERATIVA: string,
    NOMBRE_LINK: TLinkName,
    NIVEL: TTeliumTraceDataLoginLevel,
    PASO_OPERATIVA: TStep,
    PASO: TStep


}

export interface TTeliumTraceDataLoginCategory {
    PAGINA: string,
    PRODUCTO: string
}

export interface  TTeliumTraceDataLoginStep{
    ERROR: string,
    INICIO: string,
    FIRMA: string,
    CONFIRMACION: string
}

export interface TTeliumTraceDataLoginLevel {
    UNO: string,
    DOS: string,
    TRES: string
}

export type TLinkName = 'operativa_inicio'|'operativa_clave'|'operativa_confirmacion'

export type TStep = 'inicio'|'firma'|'confirmacion'

export interface TTealiumEventDataLogin {
    PREFIX: string,
    TITLE: string,
    ACTION: { [key: string]: string }
}