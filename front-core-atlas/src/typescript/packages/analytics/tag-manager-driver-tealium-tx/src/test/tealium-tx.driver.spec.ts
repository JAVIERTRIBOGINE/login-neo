import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { TealiumTxBsmDriver } from '../tealium-tx-bsm.driver.js';
import { TealiumTxWebDriver } from '../tealium-tx-web.driver.js';
import { TealiumTxDriver } from '../tealium-tx.driver.js';

describe('tealium-tx.driver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should instantiate bsm driver on native platform', () => {
    expect.assertions(1);
    (window as any).bsmbridge = true;
    // (isNative as jest.Mock).mockReturnValue(true);

    const spy = jest.fn();
    TealiumTxBsmDriver.prototype.trace = spy as any;

    const tealiumDriver: TealiumTxDriver = new TealiumTxDriver({});
    tealiumDriver.trace({ data: '' });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should instantiate web driver on web platform', () => {
    expect.assertions(1);
    (window as any).bsmbridge = false;
    const spy = jest.fn();
    TealiumTxWebDriver.prototype.trace = spy as any;

    const tealiumDriver: TealiumTxDriver = new TealiumTxDriver({});
    tealiumDriver.trace({ data: '' });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
