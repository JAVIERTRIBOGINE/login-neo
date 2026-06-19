/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  getPlatforms,
  getProteoMode,
  isAndroid,
  isDesktop,
  isFullProteo,
  isIOS,
  isJxBrowser,
  isMobile,
  isNative,
  isWebContainer
} from '../platform-utils.js';

describe('platform-utils', () => {
  beforeEach(() => {
    (global as any).bsmbridge = undefined;
    (global as any).webkit = undefined;
    window.matchMedia = jest.fn().mockImplementation((query) => {
      return {
        matches: true,
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      };
    }) as any;
    jest.clearAllMocks();
  });

  it('should validate isNative in android scenario', () => {
    expect.assertions(2);

    expect(isNative()).toBeFalsy();

    (global as any).bsmbridge = { foo: 'bar' };
    expect(isNative()).toBeTruthy();
  });

  it('should validate isNative in ios scenario', () => {
    expect.assertions(5);

    expect(isNative()).toBeFalsy();
    (global as any).webkit = { foo: 'bar' };
    expect(isNative()).toBeFalsy();
    (global as any).webkit = { messageHandlers: [] };
    expect(isNative()).toBeFalsy();
    (global as any).webkit = { messageHandlers: { fakeMethod: {} } };
    expect(isNative()).toBeFalsy();
    (global as any).webkit = { messageHandlers: { initBridge: {} } };
    expect(isNative()).toBeTruthy();
  });

  it('android device emulated on browser', () => {
    // android mobile (browser)

    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Mobile Safari/537.36',
      configurable: true
    });
    // console.log('window.matcmedia------------>', window.matchMedia(''));
    expect(isAndroid()).toBeTruthy();
    expect(isIOS()).toBeFalsy();
    expect(isMobile()).toBeTruthy();
    expect(isDesktop()).toBeFalsy();
    expect(isNative()).toBeFalsy();
    expect(isJxBrowser()).toBeFalsy();
    expect(isFullProteo()).toBeTruthy();
    expect(isWebContainer()).toBeFalsy();
    expect(getPlatforms()).toContain('android');
    expect(getPlatforms()).toContain('mobile');
  });

  it('ios device emulated on browser', () => {
    // ios mobile (browser)

    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
      configurable: true
    });
    expect(isAndroid()).toBeFalsy();
    expect(isIOS()).toBeTruthy();
    expect(isMobile()).toBeTruthy();
    expect(isDesktop()).toBeFalsy();
    expect(isNative()).toBeFalsy();
    expect(isJxBrowser()).toBeFalsy();
    expect(isFullProteo()).toBeTruthy();
    expect(isWebContainer()).toBeFalsy();
    expect(getPlatforms()).toContain('ios');
    expect(getPlatforms()).toContain('mobile');
  });

  it('ipad ios 12-', () => {
    // ios ipad (browser)

    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPad; CPU OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/16A5288q Safari/605.1.15',
      configurable: true
    });
    expect(isAndroid()).toBeFalsy();
    expect(isMobile()).toBeTruthy();
    expect(isIOS()).toBeTruthy();
    expect(isDesktop()).toBeFalsy();
    expect(isNative()).toBeFalsy();
    expect(isJxBrowser()).toBeFalsy();
    expect(isFullProteo()).toBeTruthy();
    expect(isWebContainer()).toBeFalsy();
    expect(getPlatforms()).toContain('ios');
    expect(getPlatforms()).toContain('mobile');
  });

  it('ipad ios 13+', () => {
    // ios ipad (browser)

    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko)',
      configurable: true
    });
    expect(isAndroid()).toBeFalsy();
    expect(isMobile()).toBeTruthy();
    expect(isIOS()).toBeTruthy();
    expect(isDesktop()).toBeFalsy();
    expect(isNative()).toBeFalsy();
    expect(isJxBrowser()).toBeFalsy();
    expect(isFullProteo()).toBeTruthy();
    expect(isWebContainer()).toBeFalsy();
    expect(getPlatforms()).toContain('ios');
    expect(getPlatforms()).toContain('mobile');
  });

  it('chrome browser', () => {
    // browser

    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36',
      configurable: true
    });
    window.matchMedia = jest.fn().mockImplementation((query) => {
      return {
        matches: false,
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      };
    }) as any;
    expect(isAndroid()).toBeFalsy();
    expect(isIOS()).toBeFalsy();
    expect(isMobile()).toBeFalsy();
    expect(isDesktop()).toBeTruthy();
    expect(isNative()).toBeFalsy();
    expect(isJxBrowser()).toBeFalsy();
    expect(getPlatforms()).toContain('desktop');
  });

  it('should be a escritorio eclipse env', () => {
    //JxBrowser
    expect.assertions(9);

    window.matchMedia = jest.fn().mockImplementation((query) => {
      return {
        matches: false,
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      };
    }) as any;

    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36 JxBrowser-EE/7.8',
      configurable: true
    });
    expect(isAndroid()).toBeFalsy();
    expect(isMobile()).toBeFalsy();
    expect(isIOS()).toBeFalsy();
    expect(isDesktop()).toBeTruthy();
    expect(isNative()).toBeFalsy();
    expect(isJxBrowser()).toBeTruthy();
    expect(isFullProteo()).toBeFalsy();
    expect(isWebContainer()).toBeFalsy();
    expect(getPlatforms()).toContain('desktop');
  });

  it('should test the is full proteo method', () => {
    // Defining Chrome Browser
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36',
      configurable: true
    });

    expect(isNative()).toBeFalsy();
    expect(isWebContainer()).toBeFalsy();
    expect(isJxBrowser()).toBeFalsy();
    expect(isFullProteo()).toBeTruthy();

    // Defining JxBrowser
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36 JxBrowser-EE/7.8',
      configurable: true
    });

    expect(isNative()).toBeFalsy();
    expect(isWebContainer()).toBeFalsy();
    expect(isJxBrowser()).toBeTruthy();
    expect(isFullProteo()).toBeFalsy();

    // isNative true
    (global as any).webkit = { messageHandlers: { initBridge: {} } };
    // Defining Chrome Browser
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36',
      configurable: true
    });

    expect(isNative()).toBeTruthy();
    expect(isWebContainer()).toBeFalsy();
    expect(isJxBrowser()).toBeFalsy();
    expect(isFullProteo()).toBeFalsy();

    // isWebContainer true
    jest.spyOn(window, 'parent', 'get').mockReturnValue({} as Window);

    expect(isNative()).toBeTruthy();
    expect(isWebContainer()).toBeTruthy();
    expect(isJxBrowser()).toBeFalsy();
    expect(isFullProteo()).toBeFalsy();

    // isNative false
    (global as any).webkit = { foo: 'bar' };

    expect(isNative()).toBeFalsy();
    expect(isWebContainer()).toBeTruthy();
    expect(isJxBrowser()).toBeFalsy();
    expect(isFullProteo()).toBeFalsy();
  });

  it('proteo mode should be returned by url param', () => {
    window.history.replaceState({}, 'Test Title', '/test?mode=android');
    expect(getProteoMode()).toEqual('android');
    window.history.replaceState({}, 'Test Title', '/test');
  });

  it('proteo mode should return "ios"', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
      configurable: true
    });
    expect(getProteoMode()).toEqual('ios');
  });

  it('proteo mode should return "android"', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Mobile Safari/537.36',
      configurable: true
    });
    expect(getProteoMode()).toEqual('android');
  });

  it('proteo mode should return "web"', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36 JxBrowser-EE/7.8',
      configurable: true
    });
    expect(getProteoMode()).toEqual('web');
  });
});
