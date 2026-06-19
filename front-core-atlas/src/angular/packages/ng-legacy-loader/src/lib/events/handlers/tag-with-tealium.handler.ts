import { EventManager } from '@proteo/event-bus';
import { LoggerUtils } from '@proteo/logger-utils';
import { createUUID } from '@proteo/uuid-utils';
import type { BridgeRequest, TagRequest, TagResponse } from '@proteo/types';
import type { IframeEventHandler } from '@proteo/iframe-loader';

export const tagWithTealiumHandler: IframeEventHandler<
  TagRequest<Record<string, unknown>>,
  TagResponse<Record<string, unknown>>
> = async (payload: TagRequest<Record<string, unknown>>, _iframe: HTMLIFrameElement) => {
  LoggerUtils.getInstance().debug('[tagWithTealiumHandler] screenName:', payload.options?.screenName);

  const bridgeRequest: BridgeRequest = {
    method: 'tagWithTealium',
    data: {
      screenName: payload.options?.screenName,
      params: JSON.stringify(payload.data, null, 0)
    }
  };

  return await EventManager.getInstance().publishWithResponse<TagResponse<Record<string, unknown>>>(
    'TEALIUM',
    bridgeRequest,
    {
      customID: createUUID()
    }
  );
};
