import { EventManager } from '@proteo/event-bus';
import { LoggerUtils } from '@proteo/logger-utils';
import type { OpenOperativeBridgeRequest, OpenOperativeEventPayload } from '@proteo/types';
import type { IframeEventHandler } from '@proteo/iframe-loader';

export const openOperativeHandler: IframeEventHandler<OpenOperativeEventPayload> = async (
  payload: OpenOperativeEventPayload,
  _iframe: HTMLIFrameElement
) => {
  LoggerUtils.getInstance().debug('[openOperativeHandler] operativeName:', payload.operativeName);

  const bridgeRequest: OpenOperativeBridgeRequest = {
    method: 'openOperative',
    data: payload
  };

  return await EventManager.getInstance().publishWithResponse('OPEN_OPERATIVE', bridgeRequest);
};
