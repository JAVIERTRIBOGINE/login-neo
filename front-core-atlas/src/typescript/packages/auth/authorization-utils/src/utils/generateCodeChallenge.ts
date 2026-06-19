import { base64UrlEncode, sha256 } from '@proteo/string-utils';

/**
 * Generate code challenge from the code verifier
 * @param {String} codeVerifier The code verifier
 * @returns {String} The code challenge
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const hashed = await sha256(codeVerifier);
  return base64UrlEncode(hashed);
}
