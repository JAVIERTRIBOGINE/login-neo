export const BS_COOKIE_DOMAIN = '.bancsabadell.com';
export const DEFAULT_COOKIE_PATH = '/';

/**
 * Add a cookie into the document cookies storage
 * @param name name of the cookie
 * @param value value of the cookie
 * @param expirationDays expiration days for the cookie
 * @param path path of the cookie
 * @param domain of the cookie
 */
export const setCookie = (name: string, value: string, expirationDays: number, path = '/', domain?: string): void => {
  const d = new Date();
  const HOURS_PER_DAY = 24;
  const MINUTES_PER_HOUR = 60;
  const SECONDS_PER_MINUTE = 60;
  const MILLIS_PER_SECOND = 1000;
  d.setTime(d.getTime() + expirationDays * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLIS_PER_SECOND);
  const expires = `expires=${d.toUTCString()}`;
  const cookieDomain = domain ? `;domain=${domain}` : '';

  document.cookie = `${name}=${value};${expires};path=${path}${cookieDomain}`;
};

/**
 * Retrieve a cookie from cookies storage
 * @param name name of the cookie
 * @returns the value of the cookie or undefined if does not exist
 */
export const getCookie = (name: string): string | undefined => {
  const nameLenPlus = name.length + 1;
  return (
    document.cookie
      .split(';')
      .map((c) => c.trim())
      .filter((cookie) => cookie.substring(0, nameLenPlus) === `${name}=`)
      .map((cookie) => decodeURIComponent(cookie.substring(nameLenPlus)))[0] || undefined
  );
};

/**
 * Remove a cookie from the document cookies storage
 * @param name name of the cookie to remove
 * @param path path of the cookie to remove
 * @param domain domain of the cookie to remove
 */
export const removeCookie = (name: string, path = '/', domain?: string): void => {
  const cookieDomain = domain ? `;domain=${domain}` : '';

  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC;path=${path}${cookieDomain}`;
};
