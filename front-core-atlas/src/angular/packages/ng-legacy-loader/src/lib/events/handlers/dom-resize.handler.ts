import { LoggerUtils } from '@proteo/logger-utils';
import type { ResizeEventPayload } from '@proteo/types';
import type { IframeEventHandler } from '@proteo/iframe-loader';

export const domResizeHandler: IframeEventHandler<ResizeEventPayload> = (
  payload: ResizeEventPayload,
  iframe: HTMLIFrameElement
) => {
  LoggerUtils.getInstance().debug('[domResizeHandler] height:', payload.height);
  iframe.height = (payload.height + 20).toString();
};
