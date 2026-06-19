import { LoggerUtils } from '@proteo/logger-utils';
import type { IStorageDriver } from './types/index.js';

/**
 * Driver using Session Storage as Storage type
 * It saves every keys under a base prefix `P4_DATA` to avoid collision
 */
export class SessionStorageDriver implements IStorageDriver {
  /**
   * Session storage prefix
   */
  private readonly BASE_PREFIX = 'P4_DATA';

  /**
   * Calculate session storage prefix with base prefix plus custom prefix
   * @param prefix custom prefix
   * @returns full prefix
   */
  private calculatePrefix(prefix?: string): string {
    return this.BASE_PREFIX + (prefix ? `.${prefix}` : '');
  }

  /**
   * Retrieves a given key from the browser session storage or null
   * @param key the key te be retrieved
   * @param prefix an optional prefix for the key
   * @returns {T|null} the value from the given key or null if it does not exists or is malformed
   */
  get<T>(key: string, prefix?: string): T | null {
    const item = window.sessionStorage.getItem(`${this.calculatePrefix(prefix)}.${key}`);
    let parsedItem: T | null = null;
    if (item) {
      try {
        parsedItem = JSON.parse(item) as T;
      } catch (err) {
        LoggerUtils.getInstance().error(`Session-storage: Error Parsing the key ${key} from the storage:`, err, {
          remoteLogger: true,
          type: 'application'
        });
      }
    }
    return parsedItem;
  }

  /**
   * Saves an item into the session storage. It stringify the payload
   * @param key the item key. it mus be unique
   * @param payload the item value. It will be stringified
   * @param prefix an optional prefix for saving the key
   * @returns {boolean} true if the item has been saved, false if the item's payload is malformed
   */
  set(key: string, payload: unknown, prefix?: string): boolean {
    let done = false;
    try {
      window.sessionStorage.setItem(`${this.calculatePrefix(prefix)}.${key}`, JSON.stringify(payload));
      done = true;
    } catch (err) {
      LoggerUtils.getInstance().error(
        `Session storage: Error storing ${key}. Payload object has circular dependencies`,
        err,
        {
          remoteLogger: true,
          type: 'application'
        }
      );
    }
    return done;
  }

  /**
   * Removes a key from session storage, returning the item
   * @param key the item to be removed
   * @param prefix an optional prefix for the item
   * @returns {T|null} the value from the given key or null if it does not exists or is malformed
   */
  remove<T>(key: string, prefix?: string): T | null {
    const item = this.get<T>(key, prefix);
    window.sessionStorage.removeItem(`${this.calculatePrefix(prefix)}.${key}`);
    return item;
  }

  /**
   * Returns all proteo4 items or a subset of items that satisfies the regex
   * @param query a REGEX to filter the given key
   * @returns A map with all items
   */
  getAllItems(query?: RegExp): Map<string, unknown> {
    const itemsMap = new Map<string, unknown>();
    const innerQuery = query || /.*/g;
    for (const key in window.sessionStorage) {
      const keySplitted = key.split('.');
      if (keySplitted.shift() === this.BASE_PREFIX && innerQuery.test(key)) {
        const finalKey = keySplitted.join('.');
        const value = this.get(finalKey);
        itemsMap.set(finalKey, value);
      }
    }
    return itemsMap;
  }

  /**
   * Removes all proteo4 keys
   */
  clearAll(): void {
    for (const key in window.sessionStorage) {
      const keySplitted = key.split('.');
      if (keySplitted.shift() === this.BASE_PREFIX) {
        this.remove(keySplitted.join('.'));
      }
    }
  }
}
