import { describe, it, expect } from '@jest/globals';
import { createUUID, matchesUUID } from '../uuid-utils.js';

describe('uuid-utils', () => {
  it('UUID created should pass regex validation', () => {
    expect.assertions(1);
    expect(createUUID()).toMatch(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);
  });

  describe('matchesUUID', () => {
    it('should match properly a given UUID', () => {
      expect.assertions(1);
      expect(matchesUUID('04754976-34d1-4316-b72f-def931e0f17c')).toBeTruthy();
    });

    it('should return false if not matches - random string', () => {
      expect.assertions(1);
      expect(matchesUUID('RANDOM_STRING')).toBeFalsy();
    });

    it('should return false if not matches - first key digit alter', () => {
      expect.assertions(1);
      expect(matchesUUID('04754976-34d1-3316-b72f-def931e0f17c')).toBeFalsy();
    });

    it('should return false if not matches - second key digit alter', () => {
      expect.assertions(1);
      expect(matchesUUID('04754976-34d1-4316-172f-def931e0f17c')).toBeFalsy();
    });
  });
});
