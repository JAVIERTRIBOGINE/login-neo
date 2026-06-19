import type { DataManagerResponse } from './data-manager.js';

/**
 * Types of signatures supported.
 *
 * - `VTPC1`: Type 1 signature.
 * - `VTPC2`: Type 2 signature.
 * - `VTPCB`: Biometric signature.
 */
export type SIGNATURE_TYPE = 'VTPC1' | 'VTPC2' | 'VTPCB' | 'NOT_SUPPORTED' | 'VTPC1_NOT_ENROLLED';

/**
 * Interface for the Signature Utls.
 */
/**
 * Interface representing utility functions for handling digital signatures.
 */
export interface ISignatureUtils {
  /**
   * Registers a callback function to be executed when a result is available for the given requestId.
   *
   * @param requestId - A unique identifier for the request.
   * @param callbackFn - A function to be called when the result is available.
   */
  registerResult(requestId: string, callbackFn: () => void): void;

  /**
   * Authenticates a signature using the provided payload.
   *
   * @param payload - The payload containing authentication details.
   * @returns A promise that resolves to the authentication response.
   */
  authenticateSignature(payload: AuthenticateSignaturePayload): Promise<AuthenticateSignatureResponse>;

  /**
   * Recalls a previously stored request with signature-related headers and resends it.
   *
   * @template T - The expected response data type.
   * @param interceptResponse - The response containing signature details to be added as headers.
   * @returns A promise that resolves to the response of the re-sent request.
   */
  recallWithHeaders<T = unknown>(interceptResponse: InterceptSignatureResponse): Promise<DataManagerResponse<T>>;

  /**
   * Confirms a signature using the provided payload.
   *
   * @template T - The expected response data type.
   * @param payload - The payload containing confirmation details.
   * @returns A promise that resolves to the confirmation response.
   */
  confirmSignature<T = unknown>(payload: SignatureSharedData): Promise<DataManagerResponse<T>>;

  /**
   * Sends the result for a specific request identified by requestId.
   *
   * @param requestId - A unique identifier for the request.
   * @param payload - An object containing the status and data of the result.
   */
  sendResult(requestId: string, payload: { status: boolean; data: unknown }): void;

  /**
   * Formats a number by padding it with leading zeros to match the specified length.
   *
   * @param value - The number to format.
   * @param length - The desired length of the formatted string.
   * @returns A string representation of the number with leading zeros.
   */
  formatNumberWithZeros(value: number, length: number): string;

  /**
   * Computes a hash value based on the provided OTP reference and inscription key.
   *
   * @param referOtp - The reference OTP (One-Time Password).
   * @param inscriptionKey - The key used for inscription.
   * @returns A promise that resolves to the computed hash as a string.
   */
  computeHash(referOtp: string, inscriptionKey: string): Promise<string>;

  /**
   * Prepares coordinate map data by transforming the input into a specific format.
   *
   * @param data - An array of input data to be transformed.
   * @returns An array of formatted coordinate map data.
   */
  prepareCoordinateMapData(data: CoordinateMapInput[]): CoordinateMapData[];
}

/**
 * Public interface for Coordinate Map Data Output
 */
export interface CoordinateMapData {
  number: string;
  code: string;
}

/**
 * Public interface for virtual key Input
 */
export interface CoordinateMapInput {
  virtualKey: number;
}

/**
 * Response interface for intercepting signature requests.
 */
export interface InterceptSignatureResponse {
  requestID: string;
  signatureType?: SIGNATURE_TYPE;
  isEnrollmentDevice: boolean;
  data: {
    appID: string;
    version: string;
  };
  typeRecall: string;
  headers: Record<string, string>;
  messages: Record<string, string>[];
}

/**
 * Shared signature payload used internally and across handlers when processing
 * signature-related events and confirmations.
 */
export interface SignatureSharedData {
  isEnrollmentDevice?: boolean;
  requestID: string;
  signatureType?: SIGNATURE_TYPE;
  isFraudChallengeRequired?: string | boolean;
  operationId?: string;
  id?: string;
  challenge?: string;
  otp?: string;
  virtualCoordinates?: [
    {
      index: number;
      value: string;
    }
  ];
  redirect?: {
    confirmMessage: string;
    httpMethod: string;
    url: string;
  };
  headers: Record<string, string>;
  messages: Record<string, string>[];
}

/**
 * Payload for requesting a signature process.
 *
 * @property signatureType - The type of signature to be requested.
 * @property isEnrolledDevice - Indicates if the request is made from an enrolled device.
 * @property requestId - Unique identifier for the request.
 * @property operativeName - Name of the operative performing the request.
 * @property isFraudChallengeRequired - Optional flag to indicate if a fraud challenge is required.
 */
export interface RequestSignaturePayload {
  signatureType: SIGNATURE_TYPE;
  isEnrolledDevice: boolean;
  requestId: string;
  operativeName: string;
  isFraudChallengeRequired?: boolean;
}

/**
 * Base interface for signature-related payloads.
 *
 * @property signatureType - The type of signature being handled.
 * @property signatureId - Unique identifier for the signature process.
 * @property operationId - Identifier for the operation associated with the signature.
 */
export interface SignaturePayload {
  signatureType: SIGNATURE_TYPE;
  signatureId: string;
  operationId: string;
}

/**
 * Base interface for signature-related responses.
 *
 * @property status - The status of the signature process (e.g., success or failure).
 */
export interface SignatureResponse {
  status: boolean;
}

/**
 * Payload for authenticating a signature.
 *
 * @property challenge - Optional challenge code for authentication.
 * @property fraudChallenge - Optional fraud challenge code for additional verification.
 */
export interface AuthenticateSignaturePayload extends SignaturePayload {
  challenge?: string;
  fraudChallenge?: string;
}

/**
 * Payload for confirming a signature.
 *
 * @property requestId - Unique identifier for the request.
 * @property otp - One-time password for signature confirmation.
 */
export interface ConfirmSignaturePayload extends SignaturePayload {
  requestId: string;
  otp: string;
}

/**
 * Response for authenticating a signature.
 *
 * @property otp - One-time password provided as part of the authentication response.
 */
export interface AuthenticateSignatureResponse extends SignatureResponse {
  otp: string;
}

/**
 * Interface `SignatureResultResponse` extends the `SignatureResponse` interface
 * to include additional information about a specific signature operation.
 *
 * @type {string} - Unique identifier for the signature request.
 *
 */
export interface SignatureResultResponse extends SignatureResponse {
  requestId: string;
}

/**
 * Response for confirming a signature.
 * Extends the base `SignatureResponse`.
 */
export type ConfirmSignatureResponse = SignatureResponse;

/**
 * Callback type for handling the result of a signature process.
 *
 * @param msg - Message providing context about the result.
 * @param data - Data containing the status of the signature process.
 */
export type SendResultSignatureCallback = (status: boolean, data: unknown) => void;
