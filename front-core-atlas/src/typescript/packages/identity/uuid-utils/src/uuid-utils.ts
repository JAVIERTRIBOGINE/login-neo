const HEX_BASE = 16;
const BINARY_3 = 0x3;
const BINARY_8 = 0x8;

/**
 * Function to create an UUID
 * @returns string with an UUID
 */
export function createUUID(): string {
  let date: number = new Date().getTime();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c: string) => {
    const r = ((date + Math.random() * HEX_BASE) % HEX_BASE) | 0;
    date = Math.floor(date / HEX_BASE);
    return (c === 'x' ? r : (r & BINARY_3) | BINARY_8).toString(HEX_BASE);
  });
}

/**
 * Function to check if a given string follows UUID format
 * @returns boolean if entry matches an UUID
 */
export function matchesUUID(value: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(value);
}
