import { PASSWORD_PATTERN } from './constants.js';

export const isValidPassword = (password: string): boolean => {
  const regex = new RegExp(PASSWORD_PATTERN); // Password length=8, minus & mayus, numbers, at least one special character: ,|¿?¡!:;{}=()/&%·#"@$%*&._-
  return regex.test(password);
};
