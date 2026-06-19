import { beforeEach, expect, it, jest } from '@jest/globals';
import Rox from 'rox-browser';
import { FeatureManager } from '../feature-manager';
import { LoggerUtils } from '@proteo/logger-utils';

jest.mock('rox-browser', () => ({
  setup: jest.fn(),
  dynamicApi: {
    value: jest.fn()
  }
}));

describe('FeatureManager', () => {
  let featureManager: any;

  beforeEach(async () => {
    featureManager = new FeatureManager();
    window.BsFeatureManager = featureManager;
    LoggerUtils.prototype.error = jest.fn();
    LoggerUtils.prototype.warn = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should create an instance if it doesn't exist when getting the instance", () => {
    expect.assertions(3);
    window.BsFeatureManager = undefined as unknown as any;
    expect(window.BsFeatureManager).toBe(undefined);
    const instance = FeatureManager.getInstance();
    expect(window.BsFeatureManager).not.toBe(undefined);
    expect(instance).toBe(window.BsFeatureManager);
  });

  it('should get the singleton instance', () => {
    expect.assertions(1);
    const instance = FeatureManager.getInstance();
    expect(instance).toBe(window.BsFeatureManager);
  });

  it('should register a new feature manager', async () => {
    expect.assertions(2);
    const name = 'testName';
    const key = 'testKey';

    await featureManager.register(name, key);

    expect(featureManager['_driversMap'].has(name)).toBe(true);
    expect(featureManager['_driversMap'].get(name)).toBe(key);
  });

  it('should not register a feature manager if it already exists', async () => {
    expect.assertions(1);
    const name = 'testName';
    const key = 'testKey';

    await featureManager.register(name, key);
    await featureManager.register(name, key);

    expect(featureManager['_driversMap'].size).toBe(1);
  });

  it('should use an existing feature manager', async () => {
    expect.assertions(1);

    const name = 'testName';
    const key = 'testKey';
    jest.spyOn(Rox, 'setup');

    await featureManager.register(name, key);
    await featureManager.use(name);

    expect(Rox.setup).toHaveBeenCalledTimes(2);
  });

  it('should use an existing feature manager', async () => {
    expect.assertions(1);

    const name = 'testName';
    const key = 'testKey';
    jest.spyOn(Rox, 'setup');

    await featureManager.register(name, key);
    await featureManager.use(name);

    expect(Rox.setup).toHaveBeenCalledTimes(2);
  });

  it('should log an error if Rox fails to setup', async () => {
    expect.assertions(2);

    const name = 'testName';
    const key = 'testKey';
    jest.spyOn(Rox, 'setup').mockImplementationOnce(() => {
      throw new Error();
    });

    await featureManager.register(name, key);

    expect(Rox.setup).toHaveBeenCalledTimes(1);
    expect(LoggerUtils.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('❌ [Feature Manager] Error crítico e inesperado en setup: '),
      expect.anything()
    );
  });

  it('should log an error if trying to use a non-existent feature manager', async () => {
    expect.assertions(1);
    const name = 'nonExistentName';
    jest.spyOn(LoggerUtils.getInstance(), 'info');
    await featureManager.use(name);

    expect(LoggerUtils.getInstance().info).toHaveBeenCalledWith(
      'ℹ️ [Feature Manager] This project name does not exist. Register before calling this function'
    );
  });

  it('should get the value of a feature flag', () => {
    expect.assertions(2);
    const name = 'testFlag';
    const opts = { defaultValue: 'default' };

    jest.spyOn(Rox.dynamicApi, 'value').mockReturnValue('flagValue');

    const value = featureManager.value(name, opts);

    expect(value).toBe('flagValue');
    expect(Rox.dynamicApi.value).toHaveBeenCalledWith(name, 'default', undefined);
  });

  it('should use the default value if no default value is provided', () => {
    expect.assertions(2);
    const name = 'testFlag';
    const opts = {};

    jest.spyOn(Rox.dynamicApi, 'value').mockReturnValue('flagValue');

    const value = featureManager.value(name, opts as any);

    expect(value).toBe('flagValue');
    expect(Rox.dynamicApi.value).toHaveBeenCalledWith(name, 'NOT_FOUND_FLAG', undefined);
  });
});
