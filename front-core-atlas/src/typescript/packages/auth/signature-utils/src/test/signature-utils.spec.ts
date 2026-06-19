import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { TextEncoder } from 'util';

const mockGetRequest = jest.fn();
const mockIsMobile = jest.fn();

const mockGetDriver = jest.fn();
jest.unstable_mockModule('@proteo/data-manager', () => ({
  getDriver: mockGetDriver,
  getRequest: mockGetRequest
}));

jest.unstable_mockModule('@proteo/platform-utils', () => ({
  isMobile: mockIsMobile
}));

import type {
  AuthenticateSignaturePayload,
  CoordinateMapData,
  CoordinateMapInput,
  DataManagerRequestContainer,
  DataManagerResponse,
  InterceptSignatureResponse
} from '@proteo/types';
import { EventManager } from '@proteo/event-bus';
import { LoggerUtils } from '@proteo/logger-utils';

const digest = jest.fn().mockResolvedValue(new ArrayBuffer(32) as never);

Object.defineProperty(global.self, 'crypto', { value: { subtle: { digest } } });

describe('signature-utils', () => {
  let signatureUtils: any;
  let SignatureUtils: any;

  const mockRequestContainer: DataManagerRequestContainer = {
    driverName: 'test-driver',
    request: {
      url: 'https://example.test',
      method: 'GET',
      headers: { 'existing-header': 'value' }
    }
  };

  const mockDriver = {
    http: jest.fn()
  } as any;

  const mockResponse: DataManagerResponse<unknown> = {
    data: { success: true },
    status: 200,
    statusText: 'OK',
    headers: {},
    redirected: false,
    url: ''
  };

  const mockSignatureSharedData = {
    requestID: 'test-request-id',
    signatureType: 'VTPCB' as const,
    isEnrollmentDevice: true,
    id: 'signature-id-123',
    otp: '123456',
    operationId: 'operation-id-123',
    headers: {},
    messages: []
  };

  const mockInterceptResponse: InterceptSignatureResponse = {
    requestID: 'test-request-id',
    signatureType: 'VTPCB',
    isEnrollmentDevice: true,
    data: {
      appID: 'test-app',
      version: '1.0'
    },
    typeRecall: '',
    headers: {},
    messages: []
  };

  beforeEach(async () => {
    const module = await import('../signature-utils.js');
    SignatureUtils = module.SignatureUtils;
    global.TextEncoder = TextEncoder as any;

    mockIsMobile.mockReturnValue(true);

    Object.defineProperty(window, 'BsDataManager', {
      value: {
        driversMap: new Map([
          [
            'test-driver',
            {
              getRequest: mockGetRequest,
              hasDriverConfig: jest.fn().mockReturnValue(true),
              setupByName: jest.fn(),
              http: mockDriver.http
            }
          ]
        ]),
        getRequest: mockGetRequest,
        getDriver: mockGetDriver
      },
      writable: true,
      configurable: true
    });

    Object.defineProperty(window, 'BsSignatureUtils', {
      value: undefined,
      writable: true,
      configurable: true
    });

    signatureUtils = new SignatureUtils();

    mockRequestContainer.request.headers = { 'existing-header': 'value' };

    mockGetRequest.mockImplementation((...args: any[]) => {
      const id = args[0] as string;
      return id === 'test-request-id' ? mockRequestContainer : undefined;
    });
    mockGetDriver.mockReturnValue(mockDriver);
    mockDriver.http.mockResolvedValue(mockResponse);
  });

  it('should get the singleton instance', () => {
    expect.assertions(1);
    const instance = SignatureUtils.getInstance();

    expect(instance).toBe(window.BsSignatureUtils);
  });

  it('should register a new signature utils', async () => {
    expect.assertions(2);
    const requestId = 'testResquestID';
    const callbackFn = jest.fn();

    await signatureUtils.registerResult(requestId, callbackFn);

    expect(signatureUtils['_resultMap'].has(requestId)).toBe(true);
    expect(signatureUtils['_resultMap'].get(requestId)).toBe(callbackFn);
  });

  it('should not register a signature utils if it already exists', async () => {
    expect.assertions(1);
    const requestId = 'testResquestID';
    const callbackFn = jest.fn();

    await signatureUtils.registerResult(requestId, callbackFn);
    await signatureUtils.registerResult(requestId, callbackFn);

    expect(signatureUtils['_resultMap'].size).toBe(1);
  });

  describe('recallWithHeaders', () => {
    it('should successfully recall with headers when request and driver exist', async () => {
      expect.assertions(3);

      const result = await signatureUtils.recallWithHeaders(mockInterceptResponse);

      expect(mockRequestContainer.request.headers).toEqual({
        'existing-header': 'value',
        'X-Signature-Type': 'VTPCB',
        'X-Enrolled-Status': 'ENROLLED',
        'Content-Type': 'application/json'
      });
      expect(mockDriver.http).toHaveBeenCalledWith(mockRequestContainer.request);
      expect(result).toBe(mockResponse);
    });

    it('should throw error when request container is not found', async () => {
      expect.assertions(1);
      mockGetRequest.mockImplementation(() => undefined);

      await expect(signatureUtils.recallWithHeaders(mockInterceptResponse)).rejects.toThrow(
        '[recallWithHeaders] No request found for requestId: test-request-id'
      );
    });

    it('should throw error when driver is not found', async () => {
      expect.assertions(1);
      mockGetDriver.mockReturnValue(undefined);

      await expect(signatureUtils.recallWithHeaders(mockInterceptResponse)).rejects.toThrow('[recallWithHeaders] No driver found');
    });

    it('should handle web container scenario and force VTPC1 signature type', async () => {
      mockIsMobile.mockReturnValue(false);
      const interceptResponseWithoutSignatureType: InterceptSignatureResponse = {
        requestID: 'test-request-id',
        isEnrollmentDevice: true,
        data: {
          appID: 'test-app',
          version: '1.0'
        },
        typeRecall: '',
        headers: {},
        messages: []
      };

      const result = await signatureUtils.recallWithHeaders(interceptResponseWithoutSignatureType);

      expect(mockRequestContainer.request.headers?.['X-Signature-Type']).toBe('VTPC1');
      expect(result).toBe(mockResponse);
    });

    it('should set X-Enrolled-Status to NOT_ENROLLED when isEnrollmentDevice is false', async () => {
      expect.assertions(1);
      const interceptResponseNotEnrolled = {
        ...mockInterceptResponse,
        isEnrollmentDevice: false
      };

      await signatureUtils.recallWithHeaders(interceptResponseNotEnrolled);

      expect(mockRequestContainer.request.headers?.['X-Enrolled-Status']).toBe('NOT_ENROLLED');
    });
  });

  describe('confirmSignature', () => {
    it('should successfully confirm signature when all required data is present', async () => {
      expect.assertions(3);

      const result = await signatureUtils.confirmSignature(mockSignatureSharedData);

      expect(mockRequestContainer.request.headers).toEqual({
        'existing-header': 'value',
        'X-Signature-Type': 'VTPCB',
        'X-Signature-ID': 'signature-id-123',
        'X-Signature-Code': '123456',
        'X-Operation-ID': 'operation-id-123',
        'Content-Type': 'application/json',
        'X-Enrolled-Status': 'ENROLLED'
      });
      expect(mockDriver.http).toHaveBeenCalledWith(mockRequestContainer.request);
      expect(result).toBe(mockResponse);
    });

    it('should throw error when request container is not found', async () => {
      expect.assertions(1);
      mockGetRequest.mockImplementation(() => undefined);

      await expect(signatureUtils.confirmSignature(mockSignatureSharedData)).rejects.toThrow(
        '[confirmSignature] No request found for requestId: test-request-id'
      );
    });

    it('should throw error when driver is not found', async () => {
      expect.assertions(1);
      mockGetDriver.mockReturnValue(undefined);

      await expect(signatureUtils.confirmSignature(mockSignatureSharedData)).rejects.toThrow('[confirmSignature] No driver found');
    });

    it('should throw error when otp is not provided', async () => {
      expect.assertions(1);
      const payloadWithoutOtp = {
        ...mockSignatureSharedData,
        otp: undefined
      };

      await expect(signatureUtils.confirmSignature(payloadWithoutOtp as any)).rejects.toThrow('[confirmSignature] No otp provided');
    });

    it('should set X-Enrolled-Status to NOT_ENROLLED when isEnrollmentDevice is false', async () => {
      expect.assertions(1);
      const payloadNotEnrolled = {
        ...mockSignatureSharedData,
        isEnrollmentDevice: false
      };

      await signatureUtils.confirmSignature(payloadNotEnrolled);

      expect(mockRequestContainer.request.headers?.['X-Enrolled-Status']).toBe('NOT_ENROLLED');
    });

    it('should handle signature type with underscore and extract the first part', async () => {
      expect.assertions(1);
      const payloadWithUnderscore = {
        ...mockSignatureSharedData,
        signatureType: 'VTPC1_NOT_ENROLLED' as const
      };

      await signatureUtils.confirmSignature(payloadWithUnderscore);

      expect(mockRequestContainer.request.headers?.['X-Signature-Type']).toBe('VTPC1');
    });
  });

  it('should call the callback function and delete the requestId from the map when sendResult is called with a valid requestId', () => {
    const requestId = 'testRequestId';
    const callbackFn = jest.fn();
    const payload = { status: true, data: { message: 'Success' } };

    signatureUtils['_resultMap'].set(requestId, callbackFn);

    signatureUtils.sendResult(requestId, payload);

    expect(callbackFn).toHaveBeenCalledWith(payload.status, payload.data);
    expect(signatureUtils['_resultMap'].has(requestId)).toBe(false);
  });

  it('should log a warning when sendResult is called with an invalid requestId', () => {
    const requestId = 'invalidRequestId';
    const payload = { status: false, data: { message: 'Error' } };

    const warnSpy = jest.spyOn(LoggerUtils.getInstance(), 'warn');

    signatureUtils.sendResult(requestId, payload);

    expect(warnSpy).toHaveBeenCalledWith(`[sendResult] No callback found for requestId: ${requestId}`);
  });

  it('should return an array of zeros on empty input', async () => {
    expect.assertions(1);
    const hash: string = await signatureUtils.computeHash('', '');
    expect(hash).toEqual('0000000000000000000000000000000000000000000000000000000000000000');
  });

  it('should return empty string on error', async () => {
    expect.assertions(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.TextEncoder = undefined as any;
    const hash: string = await signatureUtils.computeHash('', '');
    expect(hash).toEqual('');
  });

  it('should not fail on empty list', () => {
    expect.assertions(1);
    expect(signatureUtils.prepareCoordinateMapData([])).toEqual([]);
  });

  it('should get coordinate data with correct format', () => {
    expect.assertions(1);
    const inputData: CoordinateMapInput[] = [
      { virtualKey: 123 },
      { virtualKey: 221 },
      { virtualKey: 254 },
      { virtualKey: 78 },
      { virtualKey: 2212 },
      { virtualKey: 2 },
      { virtualKey: 231 },
      { virtualKey: 1 }
    ];
    const expectedOutputData: CoordinateMapData[] = [
      { number: '1', code: '0123' },
      { number: '2', code: '0221' },
      { number: '3', code: '0254' },
      { number: '4', code: '0078' },
      { number: '5', code: '2212' },
      { number: '6', code: '0002' },
      { number: '7', code: '0231' },
      { number: '8', code: '0001' }
    ];
    expect(signatureUtils.prepareCoordinateMapData(inputData)).toEqual(expectedOutputData);
  });

  it('When the authenticateSignature function is called, the event manager should emit an event', () => {
    EventManager.getInstance().publishWithResponse = jest.fn() as jest.MockedFunction<typeof EventManager.getInstance.prototype.publishWithResponse>;

    const payload: AuthenticateSignaturePayload = {
      signatureType: 'VTPCB',
      signatureId: 'signatureId',
      challenge: 'challenge',
      fraudChallenge: 'fraudChallenge',
      operationId: 'operationId'
    };

    signatureUtils.authenticateSignature(payload);
    expect(EventManager.getInstance().publishWithResponse).toHaveBeenCalledWith('AUTHENTICATE_SIGNATURE', {
      method: 'authenticateSignature',
      data: payload
    });
  });
});
