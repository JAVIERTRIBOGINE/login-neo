import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';
import { EventManager } from '@proteo/event-bus';
import { clearTokens, refreshTokens } from '../refresh-tokens-utils.js';
import type { RefreshTokensEventResponsePayload } from '@proteo/types';
import { LoggerUtils } from '@proteo/logger-utils';

declare global {
  interface Window {
    BsAuthorizationConfig: {
      clientID: string;
      redirectUri: string;
    };
  }
}

LoggerUtils.prototype.error = jest.fn();
LoggerUtils.prototype.warn = jest.fn();

describe('refresh-tokens-utils', () => {
  let eventResponse: RefreshTokensEventResponsePayload;
  let exception: boolean;

  beforeEach(() => {
    const tokens = { OIDC: 'token2', OAUTH: 'token1' };
    eventResponse = tokens;
    exception = false;
    EventManager.prototype.publishWithResponse = jest.fn().mockImplementation(() => {
      if (exception) throw new Error('EventManager Exception');
      return eventResponse;
    }) as typeof EventManager.prototype.publishWithResponse;
  });

  afterEach(() => {
    jest.resetAllMocks();
    clearTokens();
  });

  it('should emit an event for requesting new tokens and return the response', async () => {
    expect.assertions(3);
    const response = await refreshTokens();
    expect(EventManager.prototype.publishWithResponse).toBeCalled();
    expect(response.OAUTH).toBe('token1');
    expect(response.OIDC).toBe('token2');
  });

  it('should send clientID and requestUri if existing', async () => {
    expect.assertions(1);
    window.BsAuthorizationConfig = {
      clientID: 'mockClientID',
      redirectUri: 'mockRedirectUri'
    };
    await refreshTokens();
    expect(EventManager.prototype.publishWithResponse).toBeCalledWith('REQUEST_REFRESH_TOKENS', {
      data: {
        clientId: 'mockClientID',
        redirectUri: 'mockRedirectUri'
      },
      method: 'requestRefreshTokens'
    });
  });

  it('should return existing tokens with two requests with less time than guard', async () => {
    expect.assertions(5);
    let response = await refreshTokens();
    expect(response.OAUTH).toBe('token1');
    expect(response.OIDC).toBe('token2');
    response = await refreshTokens();
    expect(EventManager.prototype.publishWithResponse).toBeCalledTimes(1);
    expect(response.OAUTH).toBe('token1');
    expect(response.OIDC).toBe('token2');
  });

  it('should clear authorization tokens when requested', async () => {
    expect.assertions(1);
    await refreshTokens();
    clearTokens();
    await refreshTokens();
    expect(EventManager.prototype.publishWithResponse).toBeCalledTimes(2);
  });

  it('should handle error response', async () => {
    expect.assertions(1);
    eventResponse = { error: 'errorMessage' } as RefreshTokensEventResponsePayload;
    try {
      await refreshTokens();
      throw new Error('unexpected behavior');
    } catch (error) {
      expect(error).not.toEqual('unexpected behavior');
    }
  });

  it('should handle eventManagerException', async () => {
    expect.assertions(1);
    exception = true;
    try {
      await refreshTokens();
      throw new Error('unexpected behavior');
    } catch (error) {
      expect((error as any).toString()).toContain('EventManager Exception');
    }
  });
});
