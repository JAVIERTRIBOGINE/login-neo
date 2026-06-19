import { LoggerUtils } from '@proteo/logger-utils';
import type { IframeEventHandler } from '@proteo/iframe-loader';
import type { LoadUrlPayload } from '../legacy-iframe-events';

export const loadUrlHandler: IframeEventHandler<LoadUrlPayload> = (
  payload: LoadUrlPayload,
  iframe: HTMLIFrameElement
) => {
  LoggerUtils.getInstance().debug('[loadUrlHandler] url:', payload.url);
  iframe.src = payload.url;
};
