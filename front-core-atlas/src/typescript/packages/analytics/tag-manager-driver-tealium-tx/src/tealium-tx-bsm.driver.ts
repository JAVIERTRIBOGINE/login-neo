import { EventManager } from '@proteo/event-bus';
import { LoggerUtils } from '@proteo/logger-utils';
import { TagManagerDriver } from '@proteo/tag-manager-driver';
import type {
  BridgeRequest,
  TagManagerConfiguration,
  TagManagerDriverConfiguration,
  TagRequest,
  TagResponse
} from '@proteo/types';

/**
 * Tealium Driver
 */
export class TealiumTxBsmDriver extends TagManagerDriver {
  /**
   * Constructor for class
   * @param config Tag manager configuration options
   */
  constructor(config?: TagManagerConfiguration) {
    super(config);
  }

  /**
   * Initializer for this tag manager driver
   * @param conf Configuration for the driver
   */
  setup(conf: TagManagerDriverConfiguration): void {
    conf && (this._config = { class: conf?.class });
  }

  /**
   * The function send the data object to remote experience server. Not defined for this driver.
   * @param tagRequest tag request information
   * @returns {Promise<TagResponse<T>>} tag response
   */
  public async traceExperience<T>(tagRequest: TagRequest<T>): Promise<TagResponse<unknown>> {
    LoggerUtils.getInstance().warn('[TealiumTxBsmDriver] traceExperience not defined', {
      remoteLogger: true,
      type: 'application'
    });
    return { data: tagRequest.data };
  }

  /**
   * The function send the data object to remote server.
   * @param tagRequest tag request information
   * @returns {Promise<TagResponse<T>>} tag response
   */
  public async trace<T>(tagRequest: TagRequest<T>): Promise<TagResponse<T>> {
    try {
      LoggerUtils.getInstance().debug('[TealiumTxBsmDriver] data:', tagRequest.data, {
        remoteLogger: true,
        type: 'application'
      });
      return await this.eventManagement(tagRequest);
    } catch (e) {
      LoggerUtils.getInstance().error('[TealiumTxBsmDriver] driver error', e, {
        remoteLogger: true,
        type: 'application'
      });
    }

    return { data: tagRequest.data };
  }

  /**
   * Event management to send tealium data
   * @param request Tag request
   */
  async eventManagement<T>(request: TagRequest<T>): Promise<TagResponse<T>> {
    const data: BridgeRequest = {
      method: 'tagWithTealium',
      data: {
        screenName: request.options?.screenName,
        params: JSON.stringify(request.data, null, 0)
      }
    };

    return await EventManager.getInstance().publishWithResponse<TagResponse<T>>('TEALIUM', data);
  }
}
