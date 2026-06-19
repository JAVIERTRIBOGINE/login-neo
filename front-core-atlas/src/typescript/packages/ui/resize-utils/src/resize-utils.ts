import { EventManager } from '@proteo/event-bus';
import { LoggerUtils } from '@proteo/logger-utils';
import type { BridgeRequest, DOMResizeBridgeRequest } from '@proteo/types';

export class ResizeUtils {
  /**
   * The event payload to sent to the Event Bus
   */
  private readonly eventPayload: BridgeRequest = {
    method: 'domResize',
    data: {
      height: 0
    }
  };
  /**
   * An offset necessary for cover footer height on html tag
   */
  private readonly HTML_HEIGHT_OFFSET = 32;

  /**
   * Singleton instance class
   */
  private static _instance: ResizeUtils;

  /**
   * The instance created for ResizeObserver
   */
  private readonly resizeObserver!: ResizeObserver;

  /**
   * Returns the instance class of ResizeUtils
   */
  public static getInstance(): ResizeUtils {
    if (!ResizeUtils._instance) {
      ResizeUtils._instance = new ResizeUtils();
    }
    return ResizeUtils._instance;
  }

  /**
   * Constructor for class
   */
  private constructor() {
    LoggerUtils.getInstance().debug('[ResizeUtils] init resizeObserver', {
      remoteLogger: true,
      type: 'application'
    });

    this.resizeObserver = new ResizeObserver(this.handleEntries.bind(this));
  }

  /**
   * Observe the resize event on the HTML element
   * @param element: An HTMLElement
   */
  public initObserve(element: HTMLElement): void {
    LoggerUtils.getInstance().debug('[ResizeUtils] initObserve: ', element, {
      remoteLogger: true,
      type: 'application'
    });
    this.resizeObserver && this.resizeObserver.observe(element);
  }

  /**
   * Handle the entries these are observed. Extract the new height and it calls to publish action
   * @param entries : An array of entries that are observed by the resize observer utility
   */
  private handleEntries(entries: ResizeObserverEntry[]) {
    LoggerUtils.getInstance().debug('[ResizeUtils] resizeObserver: ', entries, {
      remoteLogger: true,
      type: 'application'
    });
    const height = (entries[0].target as HTMLBodyElement).clientHeight;

    LoggerUtils.getInstance().debug('[ResizeUtils] height: ', height, {
      remoteLogger: true,
      type: 'application'
    });
    this.publishResizeChange(height);
  }

  /**
   * Create a payload objet to emit the height change on the EVENT BUS
   * @param height: the height that will be published
   */
  private publishResizeChange(height: number): void {
    (this.eventPayload as DOMResizeBridgeRequest).data.height = height + this.HTML_HEIGHT_OFFSET;
    LoggerUtils.getInstance().debug('[ResizeObserverUtils] observerResize: ', this.eventPayload, {
      remoteLogger: true,
      type: 'application'
    });
    EventManager.getInstance().publish('DOM_RESIZE', this.eventPayload as DOMResizeBridgeRequest);
  }

  /**
   * Unobserve change when the parent component is destroyed
   */
  public destroy(element: HTMLElement): void {
    LoggerUtils.getInstance().debug('[ResizeUtils] destroy: ', element, {
      remoteLogger: true,
      type: 'application'
    });
    this.resizeObserver && this.resizeObserver.unobserve(element);
  }
}
