import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockWarn = jest.fn();
const mockError = jest.fn();
const mockPublish = jest.fn();

jest.unstable_mockModule('@proteo/logger-utils', () => ({
  LoggerUtils: {
    getInstance: () => ({
      warn: mockWarn,
      error: mockError
    })
  }
}));

jest.unstable_mockModule('@proteo/event-bus', () => ({
  EventManager: {
    getInstance: () => ({
      publish: mockPublish
    })
  }
}));

let IframeLoader: any;

function createMockIframe(): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  const mockPostMessage = jest.fn();
  Object.defineProperty(iframe, 'contentWindow', {
    value: { postMessage: mockPostMessage },
    writable: true
  });
  return iframe;
}

function dispatchMessageEvent(data: unknown, source?: WindowProxy): void {
  window.dispatchEvent(new MessageEvent('message', { data, source }));
}

describe('IframeLoader', () => {
  let iframe: HTMLIFrameElement;

  beforeEach(async () => {
    ({ IframeLoader } = await import('../iframe-loader.js'));
    iframe = createMockIframe();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should register window message listener on creation', () => {
      const addSpy = jest.spyOn(window, 'addEventListener');
      const loader = new IframeLoader(iframe, {});
      expect(addSpy).toHaveBeenCalledWith('message', expect.any(Function));
      loader.destroy();
    });
  });

  describe('destroy', () => {
    it('should remove window message listener', () => {
      const removeSpy = jest.spyOn(window, 'removeEventListener');
      const loader = new IframeLoader(iframe, {});
      loader.destroy();
      expect(removeSpy).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('should stop handling messages after destroy', async () => {
      const handler = jest.fn();
      const loader = new IframeLoader(iframe, { myOp: { handler } });
      loader.destroy();

      dispatchMessageEvent({ operation: 'myOp', data: {} }, iframe.contentWindow as WindowProxy);
      await Promise.resolve();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('source filtering', () => {
    it('should ignore messages from a different iframe', async () => {
      const handler = jest.fn();
      const loader = new IframeLoader(iframe, { testOp: { handler } });
      const otherIframe = createMockIframe();

      dispatchMessageEvent({ operation: 'testOp', data: {} }, otherIframe.contentWindow as WindowProxy);
      await Promise.resolve();

      expect(handler).not.toHaveBeenCalled();
      loader.destroy();
    });

    it('should ignore messages with no source', async () => {
      const handler = jest.fn();
      const loader = new IframeLoader(iframe, { testOp: { handler } });

      dispatchMessageEvent({ operation: 'testOp', data: {} });
      await Promise.resolve();

      expect(handler).not.toHaveBeenCalled();
      loader.destroy();
    });

    it('should handle messages independently when multiple loaders are active', async () => {
      const handlerA = jest.fn();
      const handlerB = jest.fn();
      const iframeB = createMockIframe();
      const loaderA = new IframeLoader(iframe, { testOp: { handler: handlerA } });
      const loaderB = new IframeLoader(iframeB, { testOp: { handler: handlerB } });

      dispatchMessageEvent({ operation: 'testOp', data: {} }, iframe.contentWindow as WindowProxy);
      await Promise.resolve();

      expect(handlerA).toHaveBeenCalled();
      expect(handlerB).not.toHaveBeenCalled();
      loaderA.destroy();
      loaderB.destroy();
    });
  });

  describe('event handling', () => {
    it('should execute handler for a registered operation', async () => {
      const handler = jest.fn<() => void>().mockReturnValue(undefined);
      const loader = new IframeLoader(iframe, { testOp: { handler } });

      dispatchMessageEvent({ operation: 'testOp', data: { value: 42 } }, iframe.contentWindow as WindowProxy);
      await Promise.resolve();

      expect(handler).toHaveBeenCalledWith({ value: 42 }, iframe);
      loader.destroy();
    });

    it('should call default onUnknownEvent when operation is not registered', async () => {
      const loader = new IframeLoader(iframe, {});

      dispatchMessageEvent({ operation: 'unknownOp', data: {} }, iframe.contentWindow as WindowProxy);
      await Promise.resolve();

      expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('Proteo4 event without operation handler: '), {});
      loader.destroy();
    });

    it('should call custom onUnknownEvent when provided', async () => {
      const onUnknownEvent = jest.fn();
      const loader = new IframeLoader(iframe, {}, { onUnknownEvent });

      dispatchMessageEvent({ operation: 'unknownOp', data: { x: 1 } }, iframe.contentWindow as WindowProxy);
      await Promise.resolve();

      expect(onUnknownEvent).toHaveBeenCalledWith({ x: 1 }, iframe);
      expect(mockWarn).not.toHaveBeenCalled();
      loader.destroy();
    });

    it('should ignore messages without operation', async () => {
      const handler = jest.fn();
      const loader = new IframeLoader(iframe, { testOp: { handler } });

      dispatchMessageEvent({ data: { value: 1 } }, iframe.contentWindow as WindowProxy);
      await Promise.resolve();

      expect(handler).not.toHaveBeenCalled();
      loader.destroy();
    });

    it('should ignore messages with empty data', async () => {
      const handler = jest.fn();
      const loader = new IframeLoader(iframe, { testOp: { handler } });

      dispatchMessageEvent(null, iframe.contentWindow as WindowProxy);
      await Promise.resolve();

      expect(handler).not.toHaveBeenCalled();
      loader.destroy();
    });
  });

  describe('postMessage response', () => {
    it('should send postMessage response when callbackId is present', async () => {
      const handler = jest.fn<() => string>().mockReturnValue('result');
      const loader = new IframeLoader(iframe, { testOp: { handler } });

      dispatchMessageEvent(
        { operation: 'testOp', callbackId: 'cb-123', data: {} },
        iframe.contentWindow as WindowProxy
      );
      await Promise.resolve();

      expect(iframe.contentWindow!.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ callbackId: 'cb-123', response: 'result' }),
        '*'
      );
      loader.destroy();
    });

    it('should wrap object response in the response field', async () => {
      const handler = jest.fn<() => object>().mockReturnValue({ status: 'ok', data: { foo: 'bar' } });
      const loader = new IframeLoader(iframe, { testOp: { handler } });

      dispatchMessageEvent(
        { operation: 'testOp', callbackId: 'cb-123', data: {} },
        iframe.contentWindow as WindowProxy
      );
      await Promise.resolve();

      expect(iframe.contentWindow!.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ callbackId: 'cb-123', response: { status: 'ok', data: { foo: 'bar' } } }),
        '*'
      );
      loader.destroy();
    });

    it('should not send postMessage response when callbackId is absent', async () => {
      const handler = jest.fn<() => string>().mockReturnValue('result');
      const loader = new IframeLoader(iframe, { testOp: { handler } });

      dispatchMessageEvent({ operation: 'testOp', data: {} }, iframe.contentWindow as WindowProxy);
      await Promise.resolve();

      expect(iframe.contentWindow!.postMessage).not.toHaveBeenCalled();
      loader.destroy();
    });

    it('should use custom targetOrigin for response postMessage', async () => {
      const handler = jest.fn<() => string>().mockReturnValue('ok');
      const loader = new IframeLoader(iframe, { testOp: { handler } }, { targetOrigin: 'https://example.com' });

      dispatchMessageEvent({ operation: 'testOp', callbackId: 'cb-1', data: {} }, iframe.contentWindow as WindowProxy);
      await Promise.resolve();

      expect(iframe.contentWindow!.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ callbackId: 'cb-1' }),
        'https://example.com'
      );
      loader.destroy();
    });

    it('should handle async handlers and send resolved response', async () => {
      const handler = jest.fn<() => Promise<string>>().mockResolvedValue('async-result');
      const loader = new IframeLoader(iframe, { asyncOp: { handler } });

      dispatchMessageEvent(
        { operation: 'asyncOp', callbackId: 'cb-async', data: {} },
        iframe.contentWindow as WindowProxy
      );
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(iframe.contentWindow!.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ callbackId: 'cb-async', response: 'async-result' }),
        '*'
      );
      loader.destroy();
    });
  });

  describe('EventManager integration', () => {
    it('should publish to EventManager when publishToEventManager is true', async () => {
      const handler = jest.fn<() => void>().mockReturnValue(undefined);
      const loader = new IframeLoader(iframe, {
        myOp: { handler, publishToEventManager: true }
      });

      dispatchMessageEvent({ operation: 'myOp', data: { x: 1 } }, iframe.contentWindow as WindowProxy);
      await Promise.resolve();

      expect(mockPublish).toHaveBeenCalledWith('myOp', { payload: { x: 1 }, response: undefined });
      loader.destroy();
    });

    it('should use eventManagerTopic when provided', async () => {
      const handler = jest.fn<() => void>().mockReturnValue(undefined);
      const loader = new IframeLoader(iframe, {
        myOp: { handler, publishToEventManager: true, eventManagerTopic: 'CUSTOM_TOPIC' }
      });

      dispatchMessageEvent({ operation: 'myOp', data: {} }, iframe.contentWindow as WindowProxy);
      await Promise.resolve();

      expect(mockPublish).toHaveBeenCalledWith('CUSTOM_TOPIC', expect.anything());
      loader.destroy();
    });

    it('should not publish to EventManager when publishToEventManager is false', async () => {
      const handler = jest.fn<() => void>().mockReturnValue(undefined);
      const loader = new IframeLoader(iframe, {
        myOp: { handler, publishToEventManager: false }
      });

      dispatchMessageEvent({ operation: 'myOp', data: {} }, iframe.contentWindow as WindowProxy);
      await Promise.resolve();

      expect(mockPublish).not.toHaveBeenCalled();
      loader.destroy();
    });

    it('should not publish to EventManager when publishToEventManager is not set', async () => {
      const handler = jest.fn<() => void>().mockReturnValue(undefined);
      const loader = new IframeLoader(iframe, { myOp: { handler } });

      dispatchMessageEvent({ operation: 'myOp', data: {} }, iframe.contentWindow as WindowProxy);
      await Promise.resolve();

      expect(mockPublish).not.toHaveBeenCalled();
      loader.destroy();
    });
  });

  describe('registerEvent', () => {
    it('should allow registering events after construction', async () => {
      const loader = new IframeLoader(iframe, {});
      const handler = jest.fn<() => void>().mockReturnValue(undefined);

      loader.registerEvent('dynamicOp', { handler });
      dispatchMessageEvent({ operation: 'dynamicOp', data: { dyn: true } }, iframe.contentWindow as WindowProxy);
      await Promise.resolve();

      expect(handler).toHaveBeenCalledWith({ dyn: true }, iframe);
      loader.destroy();
    });

    it('should override an existing event when registering with the same name', async () => {
      const handlerV1 = jest.fn<() => void>().mockReturnValue(undefined);
      const handlerV2 = jest.fn<() => void>().mockReturnValue(undefined);
      const loader = new IframeLoader(iframe, { myOp: { handler: handlerV1 } });

      loader.registerEvent('myOp', { handler: handlerV2 });
      dispatchMessageEvent({ operation: 'myOp', data: {} }, iframe.contentWindow as WindowProxy);
      await Promise.resolve();

      expect(handlerV1).not.toHaveBeenCalled();
      expect(handlerV2).toHaveBeenCalled();
      loader.destroy();
    });
  });

  describe('unregisterEvent', () => {
    it('should stop handling a removed event', async () => {
      const handler = jest.fn<() => void>().mockReturnValue(undefined);
      const loader = new IframeLoader(iframe, { myOp: { handler } });

      loader.unregisterEvent('myOp');
      dispatchMessageEvent({ operation: 'myOp', data: {} }, iframe.contentWindow as WindowProxy);
      await Promise.resolve();

      expect(handler).not.toHaveBeenCalled();
      loader.destroy();
    });
  });

  describe('sendEvent', () => {
    it('should send a postMessage to the iframe', () => {
      const loader = new IframeLoader(iframe, {});

      loader.sendEvent('parentEvent', { info: 'hello' });

      expect(iframe.contentWindow!.postMessage).toHaveBeenCalledWith(
        { operation: 'parentEvent', data: { info: 'hello' } },
        '*'
      );
      loader.destroy();
    });
  });

  describe('error handling', () => {
    it('should log error and not crash when handler throws', async () => {
      const handler = jest.fn<() => never>().mockImplementation(() => {
        throw new Error('handler error');
      });
      const loader = new IframeLoader(iframe, { failOp: { handler } });

      dispatchMessageEvent({ operation: 'failOp', data: {} }, iframe.contentWindow as WindowProxy);
      await Promise.resolve();

      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining('Error handling operation "failOp"'),
        expect.any(Error)
      );
      loader.destroy();
    });

    it('should send error response to iframe when handler throws and callbackId is present', async () => {
      const handler = jest.fn<() => never>().mockImplementation(() => {
        throw new Error('handler error');
      });
      const loader = new IframeLoader(iframe, { failOp: { handler } });

      dispatchMessageEvent(
        { operation: 'failOp', callbackId: 'cb-fail', data: {} },
        iframe.contentWindow as WindowProxy
      );
      await Promise.resolve();

      expect(iframe.contentWindow!.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ callbackId: 'cb-fail', error: expect.any(Error) }),
        '*'
      );
      loader.destroy();
    });
  });
});
