import type { AvailableProteoModes } from '@proteo/types';

/**
 * Platform utils class for implementation of PlatformUtils interface methods
 */

/**
 * This method returns true if the running platform is ipad. The platform could
 * be a device or an emulated device
 */
const isIpad = () => {
  return (
    // iOS 12 and below || iOS 13+
    /ipad/i.test(navigator.userAgent.toLowerCase()) ||
    (/macintosh/i.test(navigator.userAgent.toLowerCase()) && isMobile())
  );
};

/**
 * This method returns true if the running platform is ios. The platform could
 * be a device or an emulated device into a browser
 */
export const isIOS = () => {
  return !!navigator && (/iphone|ipod/i.test(navigator.userAgent.toLowerCase()) || isIpad());
};

/**
 * This method returns true if the running platform is android. The platform
 * could be a device or an emulated device into a browser
 */
export const isAndroid = () => {
  return !!navigator && /android|sink/i.test(navigator.userAgent.toLowerCase());
};

/**
 * This method returns true if the application is running inside a browser. The
 * browser could be on a desktop or inside a mobile device.
 */
export const isDesktop = () => {
  return !isMobile();
};

/**
 * This method returns true if the application is running inside a mobile. The application
 * could run into a native application or a browser into a mobile
 */
export const isMobile = () => {
  return !!window.matchMedia && window.matchMedia('(any-pointer:coarse)').matches;
};

/**
 * This method returns true if the application is running inside a native
 * application. Should be used in order to distinguish between platforms.
 * This method checks the existence of the bsm bridge developed to
 * communicate application and the bsm native application.
 */
export const isNative = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window;
  return !!((w.webkit && w.webkit.messageHandlers && w.webkit.messageHandlers['initBridge']) || w.bsmbridge);
};

/**
 * This method returns true if the application is running inside a JxBrowser java webview.
 */
export const isJxBrowser = () => {
  return /jxbrowser-ee/i.test(navigator.userAgent.toLowerCase());
};

/* This method returns true if the application is running inside a
 * web container (ex. iframe). False otherwise
 */
export const isWebContainer = () => {
  try {
    return window !== window.parent;
  } catch {
    return true;
  }
};
/**
 * This method returns true if the application is not running into
 * a web container (ex. iframe) neither a webview container inside
 * a native application (ex. ios, android)
 */
export const isFullProteo = () => {
  return !isNative() && !isWebContainer() && !isJxBrowser();
};

/**
 * This method returns all the platforms of the current device
 */
export const getPlatforms = () => {
  return Object.keys(PLATFORMS_MAP).filter((p) => PLATFORMS_MAP[p]());
};

/**
 * Returns the mode depending on the operating system. As example Browser in Android will return 'android'
 * if an url param 'mode' is provided the method returns its value.
 * As a default mode the method will return 'web'
 */
export const getProteoMode = (): AvailableProteoModes => {
  const results = /[?&]mode(=([^&#]*)|&|#|$)/i.exec(window.location.search);
  const PROTEO_MODE_INDEX = 2;
  if (results && results[PROTEO_MODE_INDEX] && isModeAllowed(results[PROTEO_MODE_INDEX])) {
    return results[PROTEO_MODE_INDEX] as AvailableProteoModes;
  }
  if (isIOS()) {
    return 'ios';
  }
  if (isAndroid()) {
    return 'android';
  }
  return 'web';
};

/**
 * returns the list of allowed modes
 */
export const getAllowedModes = () => {
  return ['ios', 'android', 'web'] as AvailableProteoModes[];
};

/**
 * return true if the input mode is in the allowed list of modes
 */
export const isModeAllowed = (mode: string) => {
  return getAllowedModes().includes(mode as AvailableProteoModes);
};

/**
 * Maps of platforms and functions to detect every platform
 */
const PLATFORMS_MAP: Record<string, () => boolean> = {
  ios: isIOS,
  android: isAndroid,
  desktop: isDesktop,
  mobile: isMobile,
  native: isNative,
  jxbrowser: isJxBrowser
};

/**
 * Maps of channels available where app is executing
 */
const CHANNELS_MAP: Record<string, () => boolean> = {
  bso: isWebContainer,
  bsm: isNative,
  ee: isJxBrowser
};

/**
 * This method returns the channel of the current device
 */
export const getChannel = () => {
  return Object.keys(CHANNELS_MAP).find((key) => CHANNELS_MAP[key]()) || 'full-proteo';
};
