import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LoggerUtils } from '@proteo/logger-utils';
import { SessionStorageDriver } from '../session-storage-driver.js';

describe('SessionStorageDriver test', () => {
  beforeAll(() => {
    LoggerUtils.prototype.error = jest.fn();
  });

  beforeEach(() => {
    window.sessionStorage.clear();
  });
  it('When add an item without prefix, it should be able to retrieve it', () => {
    expect.assertions(2);
    const driver = new SessionStorageDriver();
    expect(driver.get('TEST')).toBeNull();
    driver.set('TEST', 'driverTest');
    expect(driver.get('TEST')).toEqual('driverTest');
  });
  it('When add an item with a prefix, it should be retrieve only if that prefix is specified', () => {
    expect.assertions(2);
    const driver = new SessionStorageDriver();
    driver.set('TEST', 'driverTest', 'myprefix');
    expect(driver.get('TEST')).toBeNull();
    expect(driver.get('TEST', 'myprefix')).toEqual('driverTest');
  });
  it('when a malformed item is added, it should not be added to the storage', () => {
    expect.assertions(2);
    const driver = new SessionStorageDriver();
    const malformedItem: Record<string, unknown> = { otherProp: 'string' };
    malformedItem.circular = malformedItem;
    expect(driver.set('TEST', malformedItem)).toBe(false);
    expect(driver.get('TEST')).toBeNull();
  });
  it('when the storage is cleared, no proteo4 items should be retrieved', () => {
    expect.assertions(5);
    const driver = new SessionStorageDriver();
    expect(driver.get('TEST')).toBeNull();
    driver.set('TEST', 'driverTest', 'myprefix');
    driver.set('OTHER_TEST', 123);
    window.sessionStorage.setItem('OutsideProteo', 'outside');
    expect(driver.get('OTHER_TEST')).toEqual(123);
    driver.clearAll();
    expect(driver.get('OTHER_TEST')).toBeNull();
    expect(driver.get('TEST')).toBeNull();
    expect(window.sessionStorage.getItem('OutsideProteo')).toEqual('outside');
  });
  it('when getting an existing malformed item, it should return null', () => {
    expect.assertions(1);
    const driver = new SessionStorageDriver();
    window.sessionStorage.setItem('P4_DATA.test', '{"test": "test"');
    expect(driver.get('test')).toBeNull();
  });
  it('when querying all items, the whole proteo4 and only the proteo4 should be returned', () => {
    expect.assertions(3);
    const driver = new SessionStorageDriver();
    driver.set('TEST', 'driverTest');
    driver.set('OTHER_TEST', 123);
    window.sessionStorage.setItem('OutsideProteo', 'outside');
    const p4Items = driver.getAllItems();
    expect(p4Items.size).toEqual(2);
    expect(p4Items.get('OTHER_TEST')).toEqual(123);
    expect(p4Items.get('OutsideProteo')).toBeUndefined();
  });
  it('when querying an specific collection of items, the only that collection should be returned', () => {
    expect.assertions(3);
    const driver = new SessionStorageDriver();
    driver.set('TEST', 'driverTest');
    driver.set('OTHER_TEST', 123);
    window.sessionStorage.setItem('OTHER_OutsideProteo', 'outside');
    const p4Items = driver.getAllItems(/OTHER/);
    expect(p4Items.size).toEqual(1);
    expect(p4Items.get('OTHER_TEST')).toEqual(123);
    expect(p4Items.get('OTHER_OutsideProteo')).toBeUndefined();
  });
});
