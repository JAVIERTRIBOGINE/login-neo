import { isNative } from '@proteo/platform-utils';
import { TagManagerDriver } from '@proteo/tag-manager-driver';
import type { TagManagerDriverConfiguration, TagRequest, TagResponse } from '@proteo/types';
import { TealiumTxBsmDriver } from './tealium-tx-bsm.driver.js';
import { TealiumTxWebDriver } from './tealium-tx-web.driver.js';
/**
 * Tealium Driver
 */
export class TealiumTxDriver extends TagManagerDriver {
  /**
   * Driver instance. TealiumBSM for native environments and
   * TealiumWeb driver for web environments
   */
  private readonly _instance: TagManagerDriver;

  /**
   * Constructor for class
   * @param conf Tag manager configuration
   */
  constructor(conf?: TagManagerDriverConfiguration) {
    super(conf);
    if (isNative()) {
      this._instance = new TealiumTxBsmDriver(conf);
    } else {
      this._instance = new TealiumTxWebDriver(conf);
    }
  }

  /**
   * Initializer for this tag manager driver
   * @param conf Configuration for the driver
   */
  setup(conf: TagManagerDriverConfiguration): void {
    this._instance.setup({ class: conf?.class });
  }

  /**
   * The function send the data object to remote server.
   * @param tagRequest tag request information
   * @returns {Promise<TagResponse<T>>} tag response
   */
  public async trace<T>(tagRequest: TagRequest<T>): Promise<TagResponse<T>> {
    return this._instance.trace<T>(tagRequest);
  }

  /**
   * The function send the data object to remote experience server.
   * @param tagRequest tag request information
   * @returns {Promise<TagResponse<T>>} tag response
   */
  public async traceExperience<T>(tagRequest: TagRequest<T>): Promise<TagResponse<unknown>> {
    return this._instance.traceExperience<T>(tagRequest);
  }
}
