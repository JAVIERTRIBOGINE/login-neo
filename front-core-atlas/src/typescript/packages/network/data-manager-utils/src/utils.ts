import type { DataManagerResponseError, DataManagerResponseErrors, ErrorSeverity } from '@proteo/types';
import type { ErrorManagementPayload } from '@proteo/error-management-utils';

/**
 * Creates a new URL by combining the specified URLs
 *
 * @param baseURL The base URL
 * @param relativeURL The relative URL
 * @returns {string} The combined URL
 */
export function combineURLs(baseURL: string, relativeURL: string): string {
  return relativeURL ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '') : baseURL;
}

/**
 * Create URL query parameters from Typescript object
 * @param params Typescript object
 * @returns {string} Query parameters formatted
 */
export function getParams(params: Record<string, string>): string {
  return Object.keys(params)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
}

export function validateErrorFormat(error: DataManagerResponseErrors): boolean {
  let valid = false;
  if (error?.messages && error?.messages.length > 0) {
    error.messages.forEach((errorMessage: { alias: string; message: string; type: ErrorSeverity }) => {
      valid = errorMessage.alias && errorMessage.message && errorMessage.type ? true : valid;
    });
  }
  return valid;
}

export function classifyErrors(error: DataManagerResponseErrors): Array<DataManagerResponseError[]> {
  const classifiedErrors = [new Array<DataManagerResponseError>(), new Array<DataManagerResponseError>()];
  error?.messages?.forEach((errorMessage: DataManagerResponseError) => {
    if (/^Z\d*$/.test(errorMessage.alias)) {
      classifiedErrors[0].push(errorMessage);
    } else {
      classifiedErrors[1].push(errorMessage);
    }
  });
  return classifiedErrors;
}

/**
 * Convert a Legacy array of errors into a Proteo4 one
 * @param errors array of legacy errors
 * @returns {DataManagerResponseError[]} Proteo error format
 */
export function convertLegacyToP4Errors(
  errors: (ErrorManagementPayload | DataManagerResponseError)[]
): DataManagerResponseError[] {
  function manageResponseErrorParam(
    key: keyof ErrorManagementPayload,
    error: ErrorManagementPayload,
    p4Error: DataManagerResponseError
  ): void {
    const value = error[key];
    if (value) {
      p4Error.params?.push({
        name: key,
        message: value
      });
    }
  }
  const p4Errors: DataManagerResponseError[] = [];
  errors?.forEach((error: ErrorManagementPayload | DataManagerResponseError) => {
    if ((error as DataManagerResponseError).alias) {
      p4Errors.push(error as DataManagerResponseError);
    } else {
      error = error as ErrorManagementPayload;
      let code = error.code ? error.code : error.errorCode;
      code = code ? '.' + code : '';
      const p4Error: DataManagerResponseError = {
        title: error.errorMessageTitle,
        alias: `${error.errorMessage}${code}`,
        message: error.errorMessageDetail,
        type: 'ERROR',
        params: []
      };
      manageResponseErrorParam('severity', error, p4Error);
      manageResponseErrorParam('labelCta', error, p4Error);
      manageResponseErrorParam('operationCta', error, p4Error);
      manageResponseErrorParam('clickToCall', error, p4Error);
      manageResponseErrorParam('nombreOperativa', error, p4Error);
      manageResponseErrorParam('idCanal', error, p4Error);
      manageResponseErrorParam('errorCode', error, p4Error);
      if (p4Error.params?.length === 0) {
        delete p4Error['params'];
      }
      p4Errors.push(p4Error);
    }
  });
  return p4Errors;
}

export const legacyGenericErrors: ErrorManagementPayload[] = [
  {
    errorMessage: 'Quelcom no ha anat bé',
    code: 'F00000',
    errorMessageTitle: 'Vaja!, quelcom no ha anat bé...',
    errorMessageDetail: 'Ho sentim, quelcom no ha anat bé.',
    severity: 'FATAL'
  }
];

export const repeatRequestError = [
  {
    alias: 'requestID no existeix',
    message: "El requestID indicat no existeix, no s'ha pogut realitzar la petició",
    type: 'ERROR'
  }
];
