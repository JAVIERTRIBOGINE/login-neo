import { normalizeDiacritics, normalizeId, parseJwt } from '../string-utils.js';

describe('string.utils', () => {
  it('should normalize identifiers', async () => {
    expect(normalizeId('Hello App')).toBe('HELLO_APP');
    expect(normalizeId('Hello  App')).toBe('HELLO_APP');
    expect(normalizeId('Hello App!!')).toBe('HELLO_APP_');
    expect(normalizeId('HelloApp')).toBe('HELLOAPP');
    expect(normalizeId('HELLO_APP')).toBe('HELLO_APP');
    expect(normalizeId('')).toBe('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(normalizeId(undefined as any)).toBe('');
  });

  it('should normalize strings with diacritics', async () => {
    expect(normalizeDiacritics('Crème Brulée')).toBe('Creme Brulee');
    expect(normalizeDiacritics('CRÈME BRULÉE')).toBe('CREME BRULEE');
    expect(normalizeDiacritics('España')).toBe('Espana');
    expect(normalizeDiacritics('ESPAÑA')).toBe('ESPANA');
    expect(normalizeDiacritics('Ça été Micic. ÀÉÏÓÛ')).toBe('Ca ete Micic. AEIOU');
    expect(normalizeDiacritics('ÁÂÃÄÅÇÈÉàáâãäåèéêëìíîïòóôõ')).toBe('AAAAACEEaaaaaaeeeeiiiioooo');
    expect(normalizeDiacritics('')).toBe('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(normalizeId(undefined as any)).toBe('');
  });

  describe('parseJwt', () => {
    let data: unknown;
    let b64: string;

    beforeEach(() => {
      data = {
        sub: 'mockSub',
        procedencia: 'mockProcedencia'
      };
      const stringifiedData = JSON.stringify(data);
      b64 = window.btoa(stringifiedData);
    });

    it('should parse proper token successfully', () => {
      expect.assertions(1);
      expect(parseJwt<any>(`mockAny.${b64}`)).toStrictEqual(data);
    });

    it('should throw an error if the format is wrong', () => {
      expect.assertions(1);
      try {
        parseJwt<any>(`${b64}`);
      } catch (error: any) {
        expect(error.message).toBe(`Wrong JWT format: ${b64}`);
      }
    });
  });
});
