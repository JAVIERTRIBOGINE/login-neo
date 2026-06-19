import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LoggerUtils } from '@proteo/logger-utils';
import type { WebBridgeRequest } from '@proteo/types';

const mockDriver = {
  setAuthorization: jest.fn(),
  clearTokens: jest.fn(),
  hasTokens: jest.fn(),
  setup: jest.fn(),
  http: jest.fn(),
  post: jest.fn(),
  done: jest.fn(),
  getHeaders: jest.fn(),
  get: jest.fn()
};
jest.unstable_mockModule('@proteo/data-manager', () => ({
  getDriver: jest.fn().mockReturnValue(mockDriver)
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let data: any, callbackId: any;

describe('external-web-loader-bridge', () => {
  let iframe: HTMLIFrameElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dataManagerDriver: any;

  beforeEach(async () => {
    const { getDriver } = await import('@proteo/data-manager');
    const { ExternalWebLoaderBridge } = await import('../external-web-loader-bridge');
    dataManagerDriver = getDriver();
    iframe = document.createElement('iframe');
    new ExternalWebLoaderBridge(iframe);
    window.document.body.appendChild(iframe);
  });

  it('should send a Custom Event when receives a message from proteo4', (done) => {
    expect.assertions(3);
    data = 'POST';
    callbackId = '1234567890';
    const payload: WebBridgeRequest = {
      operation: 'demo',
      callbackId: callbackId,
      data: data
    };

    window.addEventListener('demo', function callback(ev) {
      const event = ev as CustomEvent<WebBridgeRequest>;
      expect(event.detail.callbackId).toBe(callbackId);
      expect(event.detail.operation).toBe('demo');
      expect(event.detail.data).toBe(data);
      window.removeEventListener('demo', callback, false);
      done();
    });
    iframe.contentWindow?.parent.postMessage(payload, '*');
  });

  it('should send an event to proteo When receives a message from external web', (done) => {
    expect.assertions(2);
    data = 'external-data';
    callbackId = '1234567890';
    const payload: WebBridgeRequest = {
      operation: '',
      callbackId: callbackId,
      data: data
    };
    iframe.contentWindow?.addEventListener('message', function callback(payload) {
      expect(payload.data.callbackId).toBe(callbackId);
      expect(payload.data.response).toBe(data);
      iframe.contentWindow?.removeEventListener('message', callback, false);
      done();
    });
    window.dispatchEvent(new CustomEvent('Proteo4Event', { detail: payload }));
  });

  it.skip('should execute a http POST driver when receiving and http POST request event', (done) => {
    expect.assertions(3);
    data = {
      method: 'POST',
      body: {},
      headers: { header1: 'value1' },
      params: { param1: 'value1' }
    };
    callbackId = '1234567890';
    const payload: WebBridgeRequest = {
      operation: 'httpRequest',
      callbackId: callbackId,
      data: data
    };

    const response = { value: 'value' };
    dataManagerDriver.post = jest.fn().mockResolvedValue(response as never) as jest.Mocked<typeof dataManagerDriver.post>;

    iframe.contentWindow?.addEventListener('message', function callback(payload) {
      expect(dataManagerDriver.post).toBeCalledWith('', data.body, data.headers, data.params);
      expect(payload.data.callbackId).toBe(callbackId);
      expect(payload.data.response).toBe(response);
      iframe.contentWindow?.removeEventListener('message', callback, false);
      done();
    });
    iframe.contentWindow?.parent.postMessage(payload, '*');
  });

  it.skip('should execute a http GET driver when receiving and http GET request event', (done) => {
    expect.assertions(3);
    data = {
      method: 'GET',
      headers: { header1: 'value1' },
      params: { param1: 'value1' }
    };
    callbackId = '1234567890';
    const payload: WebBridgeRequest = {
      operation: 'httpRequest',
      callbackId: callbackId,
      data: data
    };

    const response = { value: 'value' };
    dataManagerDriver.get = jest.fn().mockResolvedValue(response as never) as jest.Mocked<typeof dataManagerDriver.get>;

    iframe.contentWindow?.addEventListener('message', function callback(payload) {
      expect(dataManagerDriver.get).toBeCalledWith('', data.headers, data.params);
      expect(payload.data.callbackId).toBe(callbackId);
      expect(payload.data.response).toBe(response);
      iframe.contentWindow?.removeEventListener('message', callback, false);
      done();
    });
    iframe.contentWindow?.parent.postMessage(payload, '*');
  });

  it('should execute an error when passing invalid method', (done) => {
    expect.assertions(1);
    data = {
      method: 'INVALID'
    };
    callbackId = '1234567890';
    const payload: WebBridgeRequest = {
      operation: 'httpRequest',
      callbackId: callbackId,
      data: data
    };

    const spy = jest.fn();
    LoggerUtils.getInstance().error = spy;

    iframe.contentWindow?.addEventListener('message', function callback() {
      expect(spy).toBeCalled();
      iframe.contentWindow?.removeEventListener('message', callback, false);
      done();
    });
    iframe.contentWindow?.parent.postMessage(payload, '*');
  });

  it('should send a Custom Event when receives a message from Host', (done) => {
    expect.assertions(2);

    const data = { OIDC: 'OIDCToken', OAUTH: 'OAUTHToken' };
    const operation = 'REFRESH_TOKENS';
    const payload: WebBridgeRequest = { operation, data };

    iframe.contentWindow?.addEventListener('message', function callback(payload) {
      expect(payload.data.operation).toBe(operation);
      expect(payload.data.response).toBe(data);
      iframe.contentWindow?.removeEventListener('message', callback, false);
      done();
    });
    window.dispatchEvent(new CustomEvent('Proteo4Event', { detail: payload }));
  });

  it('should display an error when Host message is malformed', (done) => {
    expect.assertions(1);
    const payload = {
      data: 'invalidRequest'
    };

    const spy = jest.fn();
    LoggerUtils.getInstance().error = spy;

    iframe.contentWindow?.addEventListener('message', function callback() {
      expect(spy).toBeCalled();
      iframe.contentWindow?.removeEventListener('message', callback, false);
      done();
    });
    window.dispatchEvent(new CustomEvent('Proteo4Event', { detail: payload }));
  });
});
