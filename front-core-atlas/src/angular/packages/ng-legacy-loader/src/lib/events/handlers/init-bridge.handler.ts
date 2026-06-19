import { storedTokens } from '@proteo/data-manager';
import { I18n } from '@proteo/i18n-utils';
import { LoggerUtils } from '@proteo/logger-utils';
import type { IframeEventHandler } from '@proteo/iframe-loader';
import type { InitBridgePayload } from '../legacy-iframe-events';

export const initBridgeHandler: IframeEventHandler<InitBridgePayload, unknown> = (
  _payload: InitBridgePayload,
  _iframe: HTMLIFrameElement
) => {
  LoggerUtils.getInstance().debug('[initBridgeHandler] called');
  const tokens = storedTokens();
  return {
    language: I18n.getInstance().language,
    auth: tokens,
    externalData: {}
  };
};
