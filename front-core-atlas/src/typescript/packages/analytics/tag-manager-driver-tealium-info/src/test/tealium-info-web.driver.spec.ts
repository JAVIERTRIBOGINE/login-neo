import { describe, expect, it, jest } from '@jest/globals';
import { LoggerUtils } from '@proteo/logger-utils';
import { appendElementScript } from '@proteo/script-initialization-util';
import type { TagManagerConfiguration } from '@proteo/types';
import { TealiumInfoWebDriver } from '../tealium-info-web.driver.js';

declare global {
  interface Window {
    bsSend<T>(tealiumData: T): void;
  }
}

describe('tealium-info-web.driver', () => {
  window.bsSend = jest.fn() as any;

  it('should print an error if bsSend is not defined', async () => {
    expect.assertions(2);
    const spy = jest.fn();

    LoggerUtils.prototype.error = spy;

    const driver = new TealiumInfoWebDriver();
    driver.setup({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (driver as any)._isLoaded = Promise.resolve(false);

    await driver.trace({ data: {} });
    expect(spy).toHaveBeenNthCalledWith(1, '[TealiumInfoWebDriver] driver is not initialized properly: ', false, {
      remoteLogger: true,
      type: 'application'
    });
    expect(window.bsSend).not.toHaveBeenCalled();
  });

  it('should call window bsSend and debug message when it is defined', async () => {
    expect.assertions(2);
    const spyProceso = jest.fn();
    const spyDebug = jest.fn();
    LoggerUtils.prototype.debug = spyDebug;
    window.bsSend = spyProceso;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const driver: any = new TealiumInfoWebDriver();
    driver._isLoaded = Promise.resolve(true);

    await driver.trace({ data: { tag: 'value' } });
    expect(spyProceso).toHaveBeenCalledTimes(1);
    expect(spyDebug).toHaveBeenCalledTimes(1);
  });

  xit('should throw an error is configuration is not passed and initialize tealium is called', async () => {
    expect.assertions(2);
    const spy = jest.fn();
    LoggerUtils.prototype.error = spy;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const driver: any = new TealiumInfoWebDriver();

    await driver.initializeTealium();

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith('Tealium tag manager can not be initialized', { remoteLogger: true, type: 'application' });
  });

  it('should return loaded true when the script is present into the head', async () => {
    expect.assertions(1);

    const scriptElement = document.createElement('script');
    scriptElement.id = 'tealium_lib';
    const head = document.getElementsByTagName('head')[0];
    head.appendChild(scriptElement);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const driver: any = new TealiumInfoWebDriver({});
    expect(driver._isLoaded).toBeTruthy();
  });

  it('should append the script into concrete position', async () => {
    expect.assertions(2);

    const conf: TagManagerConfiguration = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const driver: any = new TealiumInfoWebDriver(conf);
    driver._isLoaded = Promise.resolve(true);
    appendElementScript(document.createElement('script')).catch(() => '');

    const spy = jest.fn();
    LoggerUtils.prototype.error = spy;

    document.getElementsByTagName = jest.fn().mockReturnValue(false) as any;

    appendElementScript(document.createElement('script')).catch(() => '');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('[Script Initialization util] No script was added because of no script tag HEAD existing', {
      remoteLogger: true,
      type: 'application'
    });
  });

  xit('create a script element into initialization', async () => {
    // TODO: create test for initialization. Problem: the internal promise is not resolved (onload)
  });
});
