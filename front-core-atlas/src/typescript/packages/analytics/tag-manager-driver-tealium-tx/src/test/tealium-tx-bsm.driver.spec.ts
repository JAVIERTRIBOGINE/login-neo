import { describe, expect, it, jest } from '@jest/globals';
import { EventManager } from '@proteo/event-bus';
import { LoggerUtils } from '@proteo/logger-utils';
import { TealiumTxBsmDriver } from '../tealium-tx-bsm.driver.js';

describe('tealium-tx-bsm.driver', () => {
  it('should call event manager on trace', async () => {
    expect.assertions(1);
    const spy = jest.fn();
    EventManager.getInstance().publishWithResponse = spy as any;

    const driver: TealiumTxBsmDriver = new TealiumTxBsmDriver({});
    await driver.trace({ data: '' });
    expect(spy).toHaveBeenCalledTimes(1);
  });
  it('should send the screen name with eventManager', async () => {
    expect.assertions(1);
    const spy = jest.fn();
    EventManager.getInstance().publishWithResponse = spy as any;

    const driver: TealiumTxBsmDriver = new TealiumTxBsmDriver({});
    await driver.trace({ data: '', options: { screenName: 'test' } });
    expect(spy).toHaveBeenCalledTimes(1);
  });
  it('should display an error on eventManager reject', async () => {
    expect.assertions(1);
    const spy = jest.fn();
    LoggerUtils.prototype.error = spy;

    const driver: TealiumTxBsmDriver = new TealiumTxBsmDriver({});
    driver.eventManagement = jest.fn().mockRejectedValue('Error' as never) as any;
    await driver.trace({ data: '', options: { screenName: 'test' } });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should send data as string', async () => {
    expect.assertions(1);
    const spy = jest.fn();
    EventManager.getInstance().publishWithResponse = spy as any;

    // Test emitted body as string
    const data = { data: 'value' };
    const expectedData = '{"data":"value"}';

    const driver: TealiumTxBsmDriver = new TealiumTxBsmDriver({});
    await driver.trace({ data: data, options: { screenName: 'test' } });
    expect(spy).toHaveBeenCalledWith('TEALIUM', { data: { params: expectedData, screenName: 'test' }, method: 'tagWithTealium' });
  });
});
