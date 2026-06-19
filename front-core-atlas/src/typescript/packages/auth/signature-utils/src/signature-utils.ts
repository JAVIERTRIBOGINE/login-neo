import { LoggerUtils } from '@proteo/logger-utils';
import { getRequest, getDriver } from '@proteo/data-manager';
import { HASH_ATM_LABEL, SIGNATURE_ERRORS } from './constants.js';
import type {
  AuthenticateSignaturePayload,
  AuthenticateSignatureResponse,
  BridgeRequest,
  ISignatureUtils,
  CoordinateMapData,
  CoordinateMapInput,
  SendResultSignatureCallback,
  DataManagerResponse,
  InterceptSignatureResponse,
  SignatureSharedData,
  DataManagerRequestContainer,
  IDataManagerDriver,
  DataManagerRequestOptions
} from '@proteo/types';
import { EventManager } from '@proteo/event-bus';
import { isMobile } from '@proteo/platform-utils';

export class SignatureUtils implements ISignatureUtils {
  /**
   * Result Map
   * @private
   * This map will store the requestId and the corresponding callback function.
   */
  private readonly _resultMap = new Map<string, SendResultSignatureCallback>();

  /**
   * Gets the singleton instance of the Signature Utils.
   * @returns The singleton instance of the Signature Utils.
   */
  public static getInstance(): SignatureUtils {
    if (!window.BsSignatureUtils) {
      window.BsSignatureUtils = new SignatureUtils();
    }
    return window.BsSignatureUtils;
  }

  /*********** SIGNATURE UTILS ***********/

  /**
   * Registers a callback function associated with a specific request ID.
   *
   * @param requestId - A unique identifier for the request.
   * @param callbackFn - A callback function to handle the result of the signature process.
   * @returns A promise that resolves when the callback is successfully registered.
   */
  public async registerResult(requestId: string, callbackFn: SendResultSignatureCallback): Promise<void> {
    this._resultMap.set(requestId, callbackFn);
  }

  /**
   * Publishes an event to authenticate a signature and returns a promise with the response.
   *
   * @param payload - The data needed to authenticate the signature.
   * @returns A promise resolving to the response of the authentication process.
   */
  public async authenticateSignature(payload: AuthenticateSignaturePayload): Promise<AuthenticateSignatureResponse> {
    const eventPayload: BridgeRequest = {
      method: 'authenticateSignature',
      data: payload
    };

    return EventManager.getInstance().publishWithResponse<AuthenticateSignatureResponse>(
      'AUTHENTICATE_SIGNATURE',
      eventPayload
    );
  }

  /**
   * Recall a previously stored request, attach signature-related headers and re-send it via the configured driver.
   * @param interceptResponse - The response containing signature details to be added as headers.
   * @returns A promise resolving to the response of the re-sent request.
   * @throws An error if the request or driver is not found.
   */
  public async recallWithHeaders<T = unknown>(
    interceptResponse: InterceptSignatureResponse
  ): Promise<DataManagerResponse<T>> {
    const requestContainer: DataManagerRequestContainer | undefined = getRequest(interceptResponse.requestID);

    if (!requestContainer) {
      throw new Error(`${SIGNATURE_ERRORS.RECALL_WITH_HEADERS_NO_REQUEST_FOUND} ${interceptResponse.requestID}`);
    }
    const driver: IDataManagerDriver | undefined = getDriver(requestContainer.driverName);

    if (!driver) {
      throw new Error(SIGNATURE_ERRORS.RECALL_WITH_HEADERS_NO_DRIVER_FOUND);
    }

    // Logic to fill and force signature type for web container with VTPC1 (BSO)
    const signatureType =
      !isMobile() && !interceptResponse.signatureType ? 'VTPC1' : interceptResponse.signatureType || '';

    const headers: Record<string, string> = {
      'X-Signature-Type': `${signatureType}`,
      'X-Enrolled-Status': interceptResponse.isEnrollmentDevice ? 'ENROLLED' : 'NOT_ENROLLED',
      'Content-Type': 'application/json'
    };
    requestContainer.request.headers = { ...requestContainer.request.headers, ...headers };

    return driver.http(requestContainer.request);
  }

  /**
   * Confirms a signature operation by enriching the stored request with OTP and signature metadata,
   * then dispatching the request through the configured driver HTTP client.
   * @param payload - The signature confirmation data including request ID, OTP, signature type, and other metadata.
   * @param options - DataManager request options to send within the confirm http request.
   * @returns A promise resolving to the response of the confirmation request.
   * @throws An error if the request, driver, or OTP is not found.
   */
  public async confirmSignature<T = unknown>(
    payload: SignatureSharedData,
    options?: DataManagerRequestOptions
  ): Promise<DataManagerResponse<T>> {
    const requestContainer: DataManagerRequestContainer | undefined = getRequest(payload.requestID);

    if (!requestContainer) {
      throw new Error(`${SIGNATURE_ERRORS.CONFIRM_NO_REQUEST_FOUND} ${payload.requestID}`);
    }

    if (!payload.otp) {
      throw new Error(SIGNATURE_ERRORS.CONFIRM_NO_OTP_PROVIDED);
    }

    const signatureType = payload.signatureType?.includes('_')
      ? payload.signatureType.split('_')[0]
      : payload.signatureType;

    const headers: Record<string, string> = {
      'X-Signature-Type': `${signatureType}`,
      'X-Signature-ID': `${payload.id}`,
      'X-Signature-Code': `${payload.otp}`,
      'X-Operation-ID': `${payload.operationId}`,
      'Content-Type': 'application/json',
      'X-Enrolled-Status': payload.isEnrollmentDevice ? 'ENROLLED' : 'NOT_ENROLLED'
    };

    requestContainer.request.headers = { ...requestContainer.request.headers, ...headers };

    const driver: IDataManagerDriver | undefined = getDriver(requestContainer.driverName);

    if (!driver) {
      throw new Error(SIGNATURE_ERRORS.CONFIRM_NO_DRIVER_FOUND);
    }

    return driver.http({
      url: payload.redirect?.url as string,
      headers: headers,
      data: requestContainer.request.data,
      method: requestContainer.request.method,
      options
    });
  }

  /**
   * Sends the result of a request by invoking the corresponding callback function
   * associated with the given request ID. If no callback is found for the request ID,
   * a warning is logged.
   *
   * @param requestId - The unique identifier of the request.
   * @param payload - An object containing the result of the request.
   * @param payload.status - The status of the request (e.g., success, failure).
   * @param payload.data - The data associated with the request result.
   *
   * @remarks
   * Once the callback is invoked, it is removed from the internal result map.
   * If no callback is found for the given request ID, a warning message is logged.
   */
  public sendResult(requestId: string, payload: { status: boolean; data: unknown }): void {
    const callbackFn = this._resultMap.get(requestId);
    if (callbackFn) {
      callbackFn(payload.status, payload.data);
      this._resultMap.delete(requestId);
    } else {
      LoggerUtils.getInstance().warn(`[sendResult] No callback found for requestId: ${requestId}`);
    }
  }

  /*********** GENERAL UTILS ***********/

  /**
   * Method to format the numbers to have the necessary length, adding zeros if necessary
   * @param value number value received
   * @param length desired length for the formatting
   * @returns the formatted string with the correct length
   */
  public formatNumberWithZeros(value: number, length: number): string {
    let response = value.toString();
    while (response.length < length) {
      response = '0' + response;
    }
    return response;
  }

  /**
   * OTP computing hash method
   * @param referOtp string from the bridge data field
   * @param inscriptionKey string from the bridge data field
   * @returns the outcoming formatted hash
   */
  public async computeHash(referOtp: string, inscriptionKey: string): Promise<string> {
    const message: string = HASH_ATM_LABEL + referOtp + inscriptionKey;
    let hashHex = '';
    const HEX_BASE = 16;
    const DESIRED_MIN_LENGTH = 2;

    try {
      const messageBuffer = new TextEncoder().encode(message);
      const hashBuffer = await crypto.subtle.digest('SHA-256', messageBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      hashHex = hashArray.map((b) => b.toString(HEX_BASE).padStart(DESIRED_MIN_LENGTH, '0')).join('');
    } catch (error) {
      LoggerUtils.getInstance().debug('SignatureUtils - computeHash error', error, {
        remoteLogger: true,
        type: 'application'
      });
    }

    return hashHex ? hashHex.toLocaleUpperCase() : hashHex;
  }

  /**
   * Method to format the coordinates data and pass it to the component to make it work
   * @param data array with the coordinates keys objects
   * @returns the index as number and code formatted with 4 positions
   */
  public prepareCoordinateMapData(data: CoordinateMapInput[]): CoordinateMapData[] {
    const COORDINATE_CODE_LENGTH = 4;
    return data.map((item: CoordinateMapInput, index: number) => {
      const formattedCoordinateIndex: string = (index + 1).toString();
      const formattedCoordinateCode: string = this.formatNumberWithZeros(item.virtualKey, COORDINATE_CODE_LENGTH);
      return { number: formattedCoordinateIndex, code: formattedCoordinateCode };
    });
  }
}
