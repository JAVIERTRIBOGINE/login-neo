import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SessionStorageDriver } from '../session-storage-driver.js';
import { StorageManager } from '../storage-manager';
import type { IStorageDriver } from '../types/index.js';
describe('StorageManager test', () => {
  const fakeDriver: IStorageDriver = {
    get: jest.fn() as jest.Mocked<IStorageDriver['get']>,
    set: jest.fn() as jest.Mocked<IStorageDriver['set']>,
    clearAll: jest.fn() as jest.Mocked<IStorageDriver['clearAll']>,
    getAllItems: jest.fn() as jest.Mocked<IStorageDriver['getAllItems']>,
    remove: jest.fn() as jest.Mocked<IStorageDriver['remove']>
  };

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (<any>StorageManager)._instance = null;
  });
  it('when the instance is create without driver, it should use SessionStorage Driver', () => {
    StorageManager.initInstance();
    expect(StorageManager.getInstance()).toBeInstanceOf(SessionStorageDriver);
  });

  it('when the instance is create with driver, it should use it instead of default Driver', () => {
    StorageManager.initInstance(fakeDriver);
    expect(StorageManager.getInstance()).toBe(fakeDriver);
  });

  it('when a user wants to get a driver and no instance is created it should create using the default driver and return it', () => {
    expect(StorageManager.getInstance()).toBeInstanceOf(SessionStorageDriver);
  });
});
