import { describe, expect, it, jest } from '@jest/globals';
import { TealiumInfoBsmDriver } from '../tealium-info-bsm.driver.js';
import { TealiumInfoWebDriver } from '../tealium-info-web.driver.js';
import { TealiumInfoDriver } from '../tealium-info.driver.js';

describe('tealium-info.driver', () => {
  it('should instantiate bsm driver on native platform', () => {
    expect.assertions(1);
    (window as any).bsmbridge = true;

    const spy = jest.fn();
    TealiumInfoBsmDriver.prototype.trace = spy as any;

    const tealiumDriver: TealiumInfoDriver = new TealiumInfoDriver({});
    tealiumDriver.trace({ data: '' });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should instantiate web driver on web platform', () => {
    expect.assertions(1);
    (window as any).bsmbridge = false;
    const spy = jest.fn();
    TealiumInfoWebDriver.prototype.trace = spy as any;

    const tealiumDriver: TealiumInfoDriver = new TealiumInfoDriver({});
    tealiumDriver.trace({ data: '' });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
