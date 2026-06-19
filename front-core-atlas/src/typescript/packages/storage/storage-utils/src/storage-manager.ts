import { SessionStorageDriver } from './session-storage-driver.js';
import type { IStorageDriver } from './types/index.js';

/**
 * Manage Storage Driver initialization and exposes it
 */
export class StorageManager {
  /**
   * Driver singleton instance
   */
  private static _instance: IStorageDriver;

  /**
   * Initializes the driver
   * @param driver optional driver to be use instead of SessionStorage Driver
   */
  public static initInstance(driver?: IStorageDriver): void {
    this._instance = driver || new SessionStorageDriver();
  }

  /**
   * Returns the Storage Driver as a singleton
   */
  public static getInstance(): IStorageDriver {
    if (!this._instance) {
      this.initInstance();
    }
    return this._instance;
  }
}
