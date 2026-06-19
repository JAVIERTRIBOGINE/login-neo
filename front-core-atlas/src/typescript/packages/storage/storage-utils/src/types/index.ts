/**
 * Driver definition that manages the storage. As an example could be Session Storage, Cache Storage, etc
 */
export interface IStorageDriver {
  /**
   * Retrieves a given key from the storage or null
   * @param key the key te be retrieved
   * @param prefix an optional prefix for the key
   * @returns {T|null} the value from the given key or null if it does not exists or is malformed
   */
  get: <T>(key: string, prefix?: string) => T | null;
  /**
   * Saves an item into storage. It stringify the payload
   * @param key the item key. it mus be unique
   * @param payload the item value. It will be stringified
   * @param prefix an optional prefix for saving the key
   * @returns {boolean} true if the item has been saved, false if the item's payload is malformed
   */
  set: (key: string, payload: unknown, prefix?: string) => boolean;
  /**
   * Removes a key from the storage, returning the item
   * @param key the item to be removed
   * @param prefix an optional prefix for the item
   * @returns {T|null} the value from the given key or null if it does not exists or is malformed
   */
  remove: <T>(key: string, prefix?: string) => T | null;
  /**
   * Returns all proteo4 items or a subset of items from the storage that satisfies the regex
   * @param query a REGEX to filter the given key
   * @returns A map with all items
   */
  getAllItems: (query?: RegExp) => Map<string, unknown>;
  /**
   * Removes all proteo4 keys from the storage
   */
  clearAll: () => void;
}
