import { describe, expect, it } from '@jest/globals';
import { getEnvironment } from '../environment-detection-utils';
import { EnumEnvironments } from '@proteo/types';

describe('getEnvironment', () => {
  it('should return INT', () => {
    const result = getEnvironment('https://apps.cdn.int.aws.bancsabadell.com/');
    expect(result).toBe(EnumEnvironments.INT);
  });

  it('should return PRE', () => {
    const result = getEnvironment('https://apps.cdn.pre.aws.bancsabadell.com/');
    expect(result).toBe(EnumEnvironments.PRE);
  });

  it('should return PRO', () => {
    const result = getEnvironment('https://apps.cdn.aws.bancsabadell.com/');
    expect(result).toBe(EnumEnvironments.PRO);
  });

  it('should return INT if location is in integration', () => {
    const url = 'https://apps.cdn.int.aws.bancsabadell.com/';
    // eslint-disable-next-line no-global-assign
    window = Object.create(window);
    Object.defineProperty(window, 'location', {
      value: {
        origin: url
      },
      writable: true
    });
    const result = getEnvironment();
    expect(result).toBe(EnumEnvironments.INT);
  });
});
