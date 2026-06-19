import { EnumEnvironments } from './proteo.js';

/**
 *  Tag manager setup
 */
export interface TagManagerSetup {
  /**
   * Show data on console
   */
  showDataOnConsole: boolean;
}

/**
 * Global setup for Tag Manager
 */
export interface TagManagerConfiguration extends TagManagerDriverConfiguration {
  /**
   * Driver instance for Trace utility
   */
  driver?: ITagManagerDriver;
}

/**
 * Global setup for Tag Manager
 */
export interface TagManagerDriverConfiguration {
  /**
   * Additional class for tag manager script
   */
  class?: string[];
}

/**
 * Tag Manager driver client to expose tag manager methods
 */
export interface ITagManagerDriver {
  /**
   * Initializer for this tag manager driver
   * @param conf Configuration for the driver
   */
  setup(conf: TagManagerConfiguration): void;

  /**
   * The function send the data object to remote server.
   * @param tagRequest tag request information
   * @returns {Promise<TagResponse<T>>} tag response
   */
  trace<T>(tagRequest: TagRequest<T> | TagInfoRequest<T>): Promise<TagResponse<T>>;

  /**
   * The function send the data object to remote experience server.
   * @param tagRequest tag request information
   * @returns {Promise<TagResponse<T>>} tag response
   */
  traceExperience<T>(tagRequest: TagRequest<T> | TagInfoRequest<T>): Promise<TagResponse<unknown>>;
}

/**
 * Tag request options
 */
export interface TagRequestOptions {
  /**
   * Screen name
   */
  screenName?: string;
}

/**
 * Operation for informational requests
 */
export type TagInfoOperation = 'view' | 'link';

/**
 * Tag request
 */
export interface TagInfoRequest<T> {
  /**
   * Operation
   */
  operation: TagInfoOperation;

  /**
   * Data to be sent
   */
  data: T;
}

/**
 * Tag request
 */
export interface TagRequest<T> {
  /**
   * Data to be sent
   */
  data: T;

  /**
   * Request options
   */
  options?: TagRequestOptions;
}

/**
 * Tag response
 */
export interface TagResponse<T> {
  /**
   * Data response
   */
  data: T;
}

const TAG_HOST = 'https://tags.tiqcdn.com';

const TX_PATH = {
  [EnumEnvironments.INT]: '/utag/sabadell/tx/dev',
  [EnumEnvironments.PRE]: '/utag/sabadell/tx/pre',
  [EnumEnvironments.PRO]: '/utag/sabadell/tx/pro'
};

const TX_P4_PATH = {
  [EnumEnvironments.INT]: '/utag/sabadell/tx-p4/dev',
  [EnumEnvironments.PRE]: '/utag/sabadell/tx-p4/qa',
  [EnumEnvironments.PRO]: '/utag/sabadell/tx-p4/prod'
};

const UTAG_FILE_PATH = '/utag.js';
const UTAG_SYNC_FILE_PATH = '/utag.sync.js';

export const TEALIUM_TX_UTAG_SRC = {
  [EnumEnvironments.INT]: `${TAG_HOST}${TX_PATH[EnumEnvironments.INT]}${UTAG_FILE_PATH}`,
  [EnumEnvironments.PRE]: `${TAG_HOST}${TX_PATH[EnumEnvironments.PRE]}${UTAG_FILE_PATH}`,
  [EnumEnvironments.PRO]: `${TAG_HOST}${TX_PATH[EnumEnvironments.PRO]}${UTAG_FILE_PATH}`
};

export const TEALIUM_TX_UTAG_SYNC_SRC = {
  [EnumEnvironments.INT]: `${TAG_HOST}${TX_PATH[EnumEnvironments.INT]}${UTAG_SYNC_FILE_PATH}`,
  [EnumEnvironments.PRE]: `${TAG_HOST}${TX_PATH[EnumEnvironments.PRE]}${UTAG_SYNC_FILE_PATH}`,
  [EnumEnvironments.PRO]: `${TAG_HOST}${TX_PATH[EnumEnvironments.PRO]}${UTAG_SYNC_FILE_PATH}`
};

export const TEALIUM_TX_P4_UTAG_SRC = {
  [EnumEnvironments.INT]: `${TAG_HOST}${TX_P4_PATH[EnumEnvironments.INT]}${UTAG_FILE_PATH}`,
  [EnumEnvironments.PRE]: `${TAG_HOST}${TX_P4_PATH[EnumEnvironments.PRE]}${UTAG_FILE_PATH}`,
  [EnumEnvironments.PRO]: `${TAG_HOST}${TX_P4_PATH[EnumEnvironments.PRO]}${UTAG_FILE_PATH}`
};

export const TEALIUM_TX_P4_UTAG_SYNC_SRC = {
  [EnumEnvironments.INT]: `${TAG_HOST}${TX_P4_PATH[EnumEnvironments.INT]}${UTAG_SYNC_FILE_PATH}`,
  [EnumEnvironments.PRE]: `${TAG_HOST}${TX_P4_PATH[EnumEnvironments.PRE]}${UTAG_SYNC_FILE_PATH}`,
  [EnumEnvironments.PRO]: `${TAG_HOST}${TX_P4_PATH[EnumEnvironments.PRO]}${UTAG_SYNC_FILE_PATH}`
};
