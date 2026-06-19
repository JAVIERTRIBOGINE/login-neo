const HEX_BASE = 16;

function getNumbers(digits: number) {
  return (decimal: number) => decimal.toString(HEX_BASE).padStart(digits, '0').slice(-digits);
}

/**
 * Generate a random string containing numbers and letters
 * @param {Number} length length of the random string
 * @returns {String} The hash of the input text.
 */
export function generateRandomString(length = 56, digitsByItem = 2): string {
  const array = new Uint32Array(length / digitsByItem);
  window.crypto.getRandomValues(array);
  return Array.from(array, getNumbers(digitsByItem)).join('');
}
