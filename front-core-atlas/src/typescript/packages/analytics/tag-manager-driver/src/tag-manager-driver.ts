import type {
  ITagManagerDriver,
  TagInfoRequest,
  TagManagerConfiguration,
  TagManagerDriverConfiguration,
  TagRequest,
  TagResponse
} from '@proteo/types';

/**
 * Abstract Driver
 */
export abstract class TagManagerDriver implements ITagManagerDriver {
  /**
   * Tag manager Configuration
   */
  protected _config?: TagManagerConfiguration;

  /**
   * Constructor class
   * @param conf optional configuration
   */
  constructor(conf?: TagManagerConfiguration) {
    conf && (this._config = conf);
  }

  /**
   * Initializer for this tag manager driver
   * @param conf Configuration for the driver
   */
  abstract setup(conf: TagManagerDriverConfiguration): void;

  /**
   * The function send the data object to remote server.
   * @param tagRequest tag request information
   * @returns {Promise<TagResponse<T>>} tag response
   */
  abstract trace<T>(tagRequest: TagRequest<T> | TagInfoRequest<T>): Promise<TagResponse<T>>;

  /**
   * The function send the data object to remote experience server.
   * @param tagRequest tag request information
   * @returns {Promise<TagResponse<T>>} tag response
   */
  abstract traceExperience<T>(tagRequest: TagRequest<T> | TagInfoRequest<T>): Promise<TagResponse<unknown>>;
}
