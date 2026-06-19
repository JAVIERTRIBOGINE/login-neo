/**
 * Base Path for sending architecture logs to API
 */
export const ARCHITECTURE_LOG_BASE_PATH = '/logging/v1';

/**
 * Default timer for debounce function
 */
export const DEBOUNCE_TIMER = 10000;

/**
 * Default max length of the array of objects sent per request
 */
export const BUFFER_MAX_SIZE = 100;

/**
 * Default max length of the pending buffer (logs stored while unauthenticated)
 * When full, oldest logs are discarded (FIFO)
 */
export const PENDING_BUFFER_MAX_SIZE = 150;

export const NO_ID_PROVIDED: string = 'No ID provided';
