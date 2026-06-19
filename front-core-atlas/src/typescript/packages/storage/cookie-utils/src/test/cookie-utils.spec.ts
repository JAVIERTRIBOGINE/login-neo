import { describe, it, expect } from '@jest/globals';
import { getCookie, setCookie, removeCookie } from '../cookie-utils.js';

describe('cookie-utils', () => {
  it('should store a cookie into the cookie manager', () => {
    expect.assertions(1);
    setCookie('test1', 'values1', 1);
    expect(document.cookie).toBe('test1=values1');
  });

  it('should store cookie when path and domain is passed', () => {
    expect.assertions(1);
    setCookie('test1', 'values1', 1, '/', 'localhost');
    expect(document.cookie).toBe('test1=values1');
  });

  it('should retrieve a cookie into the cookie manager', () => {
    expect.assertions(1);
    setCookie('test2', 'value2', 1);
    expect(getCookie('test2')).toBe('value2');
  });

  it('should return undefined for inexistent cookie', () => {
    expect.assertions(1);
    expect(getCookie('inexistent')).toBeUndefined();
  });

  it('should remove cookie when specified', () => {
    expect.assertions(2);
    setCookie('test3', 'value3', 1);
    expect(getCookie('test3')).toBe('value3');
    removeCookie('test3');
    expect(getCookie('test3')).toBeUndefined();
  });

  it('should remove cookie when path and domain is passed', () => {
    expect.assertions(2);
    setCookie('test3', 'value3', 1, '/', 'localhost');
    expect(getCookie('test3')).toBe('value3');
    removeCookie('test3', '/', 'localhost');
    expect(getCookie('test3')).toBeUndefined();
  });

  it('should do nothing when trying to remove a cookie that does not exist', () => {
    expect.assertions(1);
    removeCookie('test4');
    expect(getCookie('test4')).toBeUndefined();
  });
});
