export enum AUTH_MANAGER_EVENTS {
  AUTH_SUCCESS         = 'AUTH_MANAGER:SUCCESS',      // SSO Cookie establecida — continuar OAuth
  REDIRECT_CREDENTIALS = 'AUTH_MANAGER:CREDENTIALS',  // métodos transparentes fallaron — mostrar formulario
  AUTH_ERROR           = 'AUTH_MANAGER:ERROR',         // error no recuperable
}

export interface AuthManagerEvent {
  type: AUTH_MANAGER_EVENTS;
  payload?: unknown;
}
