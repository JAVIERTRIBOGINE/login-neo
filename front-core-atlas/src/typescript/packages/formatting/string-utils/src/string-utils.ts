/**
 * Removes special characters and replaces by underscore. Finally it capitalize all the string
 * @param id identifier
 * @returns normalized identifier
 */
export const normalizeId = (id: string) => {
  return (
    id
      ?.replace(/[^A-Z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .toUpperCase() || ''
  );
};

/**
 * Removes characters with diacritics and replaces them with their non diacritic form
 * @param input string to normalize
 * @returns normalized string
 */
export const normalizeDiacritics = (input: string) => {
  return input?.normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
};

/**
 * Calculate SHA256 hash of a string
 * @param {String} input input text
 * @returns {Promise<ArrayBuffer>} The hash of the input text.
 */
export const sha256 = (input: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  return window.crypto.subtle.digest('SHA-256', data);
};

/**
 *
 * Convert a string to a base64url encoded string
 * btoa accepts chars only within ascii 0-255 and base64 encodes them.
 * Then convert the base64 encoded to base64url encoded
 *  - replace + with -
 *  - replace / with _
 *  - trim trailing =
 * @param {String} input The string to encode
 * @returns {String} The base64url encoded string
 */
export const base64UrlEncode = (input: ArrayBuffer) => {
  const array = Array.from(new Uint8Array(input));
  return window.btoa(String.fromCharCode.apply(null, array)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const HEX_BASE = 16;
const CHARACTER_PART = -2;

/**
 *
 * Decodes a Jwt token returning the specified data type.
 * Throws an error if received Jwt Token is not well formatted
 * @param {String} token The token to decode and fetch data from
 * @returns {T} The specified data type extracted from the Jwt Token
 */
export const parseJwt = <T>(token: string): T => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(HEX_BASE)).slice(CHARACTER_PART);
        })
        .join('')
    );
    return JSON.parse(jsonPayload) as T;
  } catch {
    throw new Error(`Wrong JWT format: ${token}`);
  }
};
