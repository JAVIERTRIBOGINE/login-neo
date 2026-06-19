type EnvironmentType = 'INT' | 'PRE' | 'PRO';

export type ErrorSeverityType = 'CRITICAL' | 'FATAL' | 'ERROR' | 'WARNING' | 'INFO' | 'ORDINARY';

export enum ProteoErrorEnum {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  UNSATISFIED_LOAD = 'UNSATISFIED_LOAD',
  GENERIC_ERROR = 'GENERIC_ERROR'
}

export const ProteoErrorKeyMap: Partial<Record<ProteoErrorEnum, string[]>> = {
  [ProteoErrorEnum.CONNECTION_FAILED]: [
    'Failed to fetch dynamically imported module',
    'Importing a module script failed.'
  ],
  [ProteoErrorEnum.UNSATISFIED_LOAD]: ['Unsatisfied version']
};

export interface ErrorManagementPayload {
  errorMessage?: string;
  code?: string;
  errorMessageTitle: string;
  errorMessageDetail: string;
  errorCode?: string;
  severity: ErrorSeverityType;
  labelCta?: string;
  operationCta?: string;
  clickToCall?: string;
  nombreOperativa?: string;
  idCanal?: EnvironmentType;
  proteoError?: ProteoErrorEnum;
  errorSource?: string;
}
