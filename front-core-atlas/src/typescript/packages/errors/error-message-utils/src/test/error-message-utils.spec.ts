import { ProteoErrorEnum } from '@proteo/error-management-utils';
import { checkErrorCodeZ, getErrorCodeZ, getProteoErrorByMsg } from '../error-message-utils.js';
import { describe, it, expect } from '@jest/globals';

describe('error-message-utils', () => {
  it('Should distinguish correctly when the text message has correct Z error or not', () => {
    expect(checkErrorCodeZ('38493403')).toBeFalsy();
    expect(checkErrorCodeZ('This is a test with dot.')).toBeFalsy();
    expect(checkErrorCodeZ('This is a test without dot')).toBeFalsy();
    expect(checkErrorCodeZ('384.934.03')).toBeFalsy();
    expect(checkErrorCodeZ('3849.Z49503.3403')).toBeFalsy();
    expect(checkErrorCodeZ('38493403.Z43')).toBeFalsy();
    expect(checkErrorCodeZ('38493403Z38493')).toBeFalsy();
    expect(checkErrorCodeZ('38493403.Z')).toBeFalsy();
    expect(checkErrorCodeZ('38493403.K49302')).toBeFalsy();
    expect(checkErrorCodeZ('.Z49503Another Test')).toBeFalsy();
    expect(checkErrorCodeZ('Error example.Z94030.not a good example')).toBeFalsy();
    expect(checkErrorCodeZ('38493403.Z94030.not a good example')).toBeFalsy();
    expect(checkErrorCodeZ('38493403.Z94030')).toBeTruthy();
    expect(checkErrorCodeZ('Correct test example.Z49033')).toBeTruthy();
  });

  it('Should recover properly the object when the Z code is present on the text', () => {
    const object = getErrorCodeZ('Correct example.Z39493');
    expect(object.text).toBe('Correct example.');
    expect(object.zCode).toBe('Z39493');
  });

  it('Should throw an error when there is no Z error or is not passed correctly', () => {
    try {
      const object = getErrorCodeZ('Wrong example');
      expect(object).toBe({ text: 'Correct example', zCode: '' });
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  describe('getProteoErrorByMsg', () => {
    it('should return proper ProteoError for defined key', () => {
      expect.assertions(1);
      expect(getProteoErrorByMsg('Importing a module script failed.')).toBe(ProteoErrorEnum.CONNECTION_FAILED);
    });
    it('should return generic ProteoError for not defined key', () => {
      expect.assertions(1);
      expect(getProteoErrorByMsg('mockWrongKey')).toBe(ProteoErrorEnum.GENERIC_ERROR);
    });
  });
});
