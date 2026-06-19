import { LoggerUtils } from '@proteo/logger-utils';

const PROTEO_SYNC_EVENTS = {
  WAKE_UP_P4: 'wakeUpP4',
  WAKE_UP_P4_NP: 'wakeUpP4NP',
  WEB_EE_BRIDGE: 'webEEBridge'
} as const satisfies Record<string, string>;

type ProteoSyncEvent = (typeof PROTEO_SYNC_EVENTS)[keyof typeof PROTEO_SYNC_EVENTS];

type ProteoSyncPayload = {
  detail: {
    data?: string;
    callbackId?: string;
    response?: string;
  };
};

/**
 * Manages synchronization and communication events between the web application
 * and the external environment (EE).
 */
export class ProteoSync {
  /**
   * The universally unique identifier used for the current synchronization process.
   */
  private uuid: string | undefined;

  /**
   * Callback triggered to wake up the P4 process with output expectations.
   * Updates the internal UUID and dispatches the 'wakeUpP4' custom event.
   * @param uuid - The unique identifier received from the external environment.
   */
  public callbackSibisEbranch(uuid: string): void {
    this.dispatchWakeUp(PROTEO_SYNC_EVENTS.WAKE_UP_P4, uuid);
  }

  /**
   * Callback triggered to wake up the P4 process without output expectations.
   * Updates the internal UUID and dispatches the 'wakeUpP4NP' custom event.
   * @param uuid - The unique identifier received from the external environment.
   */
  public callbackSibisEbranchWithoutOutput(uuid: string): void {
    this.dispatchWakeUp(PROTEO_SYNC_EVENTS.WAKE_UP_P4_NP, uuid);
  }

  /**
   * Callback used to handle context retrieval from the external environment.
   * Logs the reception and dispatches the 'webEEBridge' custom event.
   * @param callbackId - The specific identifier for the callback execution.
   * @param response - The response payload string received from the EE.
   */
  public callbackGetContext(callbackId: string, response: string): void {
    LoggerUtils.getInstance().debug('Event received from EE', callbackId, response);

    const eventPayload: ProteoSyncPayload = {
      detail: { callbackId, response }
    };
    this.dispatch(PROTEO_SYNC_EVENTS.WEB_EE_BRIDGE, eventPayload);
  }

  /**
   * Retrieves the currently stored UUID.
   * @returns The current UUID string, or undefined if it hasn't been set yet.
   */
  public getUuid(): string | undefined {
    return this.uuid;
  }

  /**
   * Internal helper method to update the UUID state and prepare the payload
   * for wake-up related events.
   * @param eventName - The strictly typed name of the event to dispatch.
   * @param uuid - The unique identifier to store and include in the payload.
   */
  private dispatchWakeUp(eventName: ProteoSyncEvent, uuid: string): void {
    this.uuid = uuid;
    const eventPayload: ProteoSyncPayload = {
      detail: { data: uuid }
    };
    this.dispatch(eventName, eventPayload);
  }

  /**
   * Core internal method responsible for instantiating and firing the CustomEvent
   * to the global window object.
   * @param eventName - The strictly typed name of the event.
   * @param eventPayload - The formatted payload object containing the event details.
   */
  private dispatch(eventName: ProteoSyncEvent, eventPayload: ProteoSyncPayload): void {
    window.dispatchEvent(new CustomEvent(eventName, eventPayload));
  }
}
