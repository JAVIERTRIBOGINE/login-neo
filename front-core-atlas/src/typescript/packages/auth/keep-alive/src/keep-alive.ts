import { EventManager } from '@proteo/event-bus';
import { LoggerUtils } from '@proteo/logger-utils';
import type { KeepAliveToBridgeRequest } from '@proteo/types';

/**
 * Utils class for Proteo4 keep-alive
 */

export class KeepAlive {
  /**
   * Singleton instance class
   */
  private static _instance: KeepAlive;

  /**
   * Timer for Keeping session alive
   */
  private readonly refreshKeepAlive: number;

  /**
   * Interval for preventing KEEP_ALIVE being published many consecutive times
   */
  private interval!: ReturnType<typeof setInterval> | null;

  /**
   * Default constructor for class
   * @param refreshTimer refresh timer fixed value
   */
  private constructor(refreshTimer = 60000) {
    // Standard lifetime for P4 tokens is 4 minutes so the default timer is set to 1 minute
    this.refreshKeepAlive = refreshTimer;
  }

  /**
   * Init instance as singleton with refresh timer set
   */
  public static initInstance(): void {
    if (!window.BsKeepAliveUtils) {
      this._instance = new KeepAlive();
      window.BsKeepAliveUtils = new KeepAlive();
    } else {
      window.BsKeepAliveUtils = KeepAlive._instance;
    }
  }

  /**
   * Returns the instance class of PlatformUtils
   */
  public static getInstance(): KeepAlive {
    if (!window.BsKeepAliveUtils) {
      KeepAlive.initInstance();
    }
    return window.BsKeepAliveUtils;
  }

  /**
   * Checks the last time the KEEP-ALIVE event was published and the actual time
   * If the difference exceeds the limit, the event will be published again
   */
  public keepAlive(): void {
    if (!this.interval) {
      const payload: KeepAliveToBridgeRequest = { method: 'keepAlive' };
      EventManager.getInstance().publish('KEEP_ALIVE', payload);
      this.setKeepAliveInterval();
      LoggerUtils.getInstance().debug('Keep Alive: event sent and interval initialized', {
        remoteLogger: true,
        type: 'application'
      });
    }
  }

  /**
   * Makes an interval to control the KEEP-ALIVE is not published continuously
   */
  private setKeepAliveInterval(): void {
    const interval_time = 10000;
    if (!this.interval) {
      let counter = this.refreshKeepAlive;
      this.interval = setInterval(() => {
        counter = counter - interval_time;
        if (counter < 0) {
          this.interval && clearInterval(this.interval);
          this.interval = null;
          LoggerUtils.getInstance().debug('Keep Alive: interval cleared', {
            remoteLogger: true,
            type: 'application'
          });
        }
      }, interval_time);
    }
  }
}
