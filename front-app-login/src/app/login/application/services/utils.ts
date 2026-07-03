import { base64UrlEncode, sha256 } from '@proteo/string-utils';

const HEX_BASE = 16;

export function generateRandomString(length = 56, digitsByItem = 2): string {
  const array = new Uint32Array(length / digitsByItem);
  window.crypto.getRandomValues(array);
  return Array.from(array, getNumbers(digitsByItem)).join('');
}

export function getNumbers(digits: number) {
  return (decimal: number) => decimal.toString(HEX_BASE).padStart(digits, '0').slice(-digits);
}

export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const hashed = await sha256(codeVerifier);
  return base64UrlEncode(hashed);
}
