import { EventManager } from '@proteo/event-bus';
import type { BiometricResponse, BridgeRequest } from '@proteo/types';

/**
 * Emits event for check biometric
 */
export const requestBiometric = (): Promise<BiometricResponse> => {
  const payload: BridgeRequest = {
    method: 'requestBiometric'
  };

  return EventManager.getInstance().publishWithResponse<BiometricResponse>('REQUEST_BIOMETRIC', payload);
};
