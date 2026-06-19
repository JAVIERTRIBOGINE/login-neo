import { describe, expect, it } from '@jest/globals';
import type { DocumentIdentityType } from '@proteo/types';
import { DocumentValidation } from '../document-validation.js';

describe('document-validation', () => {
  const DNI_VALUE = '00000000T';
  const NIE1_VALUE = 'X0316101N';
  const NIE2_VALUE = 'Y7553516P';
  const NIE3_VALUE = 'Z0586493K';
  const CIF_VALUE = 'J87803813';
  const CIF_E_VALUE = 'E18633594';
  const CIF_P_VALUE = 'P3595304A';
  const ERROR_VALUE = '1234567890';
  const DNI_TYPE: DocumentIdentityType = 'dni';
  const NIE_TYPE: DocumentIdentityType = 'nie';
  const CIF_TYPE: DocumentIdentityType = 'cif';

  it('should return true for a valid DNI', () => {
    expect(DocumentValidation.isValidDocument(DNI_VALUE)).toBeTruthy();
  });

  it('should return false for an invalid DNI', () => {
    expect(DocumentValidation.isValidDocument('29555686H')).toBeFalsy();
    expect(DocumentValidation.isValidDocument('27323909R ')).toBeFalsy();
  });

  it('should return false for an invalid DNI with trailing letters or numbers', () => {
    expect(DocumentValidation.isValidDocument('46978452Da')).toBeFalsy();
    expect(DocumentValidation.isValidDocument('46978452D0')).toBeFalsy();
    expect(DocumentValidation.isValidDocument('46978452D$')).toBeFalsy();
  });

  it('should return false for an invalid CIF', () => {
    expect(DocumentValidation.isValidDocument('R0461228Iabcd')).toBeFalsy();
  });

  it('should return true for a valid NIE', () => {
    expect.assertions(3);
    expect(DocumentValidation.isValidDocument(NIE1_VALUE)).toBeTruthy();
    expect(DocumentValidation.isValidDocument(NIE2_VALUE)).toBeTruthy();
    expect(DocumentValidation.isValidDocument(NIE3_VALUE)).toBeTruthy();
  });
  it('should return false for an invalid NIE', () => {
    expect(DocumentValidation.isValidDocument('X0318801N')).toBeFalsy();
    expect(DocumentValidation.isValidDocument('X6346397F ')).toBeFalsy();
  });

  it('should return true for a valid CIF', () => {
    expect(DocumentValidation.isValidDocument(CIF_VALUE)).toBeTruthy();
    expect(DocumentValidation.isValidDocument(CIF_E_VALUE)).toBeTruthy();
    expect(DocumentValidation.isValidDocument(CIF_P_VALUE)).toBeTruthy();
  });

  it('should return false for an invalid CIF', () => {
    expect(DocumentValidation.isValidDocument('J87803815')).toBeFalsy();
  });

  it('should return false for an invalid Document', () => {
    expect(DocumentValidation.isValidDocument(ERROR_VALUE)).toBeFalsy();
  });

  it('should return false for a valid document but invalid DocumentIdentity type ', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(DocumentValidation.isValidDocument(DNI_VALUE, ['pepe'] as any)).toBeFalsy();
  });

  it('should return true for a valid document with correct document identity type', () => {
    expect(DocumentValidation.isValidDocument(DNI_VALUE, [DNI_TYPE])).toBeTruthy();
    expect(DocumentValidation.isValidDocument(NIE1_VALUE, [NIE_TYPE])).toBeTruthy();
    expect(DocumentValidation.isValidDocument(CIF_VALUE, [NIE_TYPE, CIF_TYPE])).toBeTruthy();
  });

  it('should return false for a valid document with different document identity type', () => {
    expect(DocumentValidation.isValidDocument(DNI_VALUE, [NIE_TYPE])).toBeFalsy();
    expect(DocumentValidation.isValidDocument(NIE1_VALUE, [DNI_TYPE, CIF_TYPE])).toBeFalsy();
    expect(DocumentValidation.isValidDocument(CIF_VALUE, [DNI_TYPE])).toBeFalsy();
  });
});
