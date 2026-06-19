export interface IframeLoaderOptions {
  /** Prefix for log messages. @default '[IframeLoader]' */
  logPrefix?: string;

  /**
   * Allowed origin for postMessage (targetOrigin).
   * @default '*' — compatible with current ng-legacy-loader behavior.
   * In production, it is recommended to restrict this to the actual iframe origin.
   */
  targetOrigin?: string;

  /**
   * Callback invoked when an unregistered operation is received.
   * @default logs a warning: "Proteo4 event without operation handler: " + data.
   */
  onUnknownEvent?: (data: unknown, iframe: HTMLIFrameElement) => void;
}
