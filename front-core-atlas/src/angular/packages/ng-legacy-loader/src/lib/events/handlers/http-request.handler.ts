import { getDriver } from '@proteo/data-manager';
import { LoggerUtils } from '@proteo/logger-utils';
import type { DataManagerRequest, DataManagerResponse } from '@proteo/types';
import type { IframeEventHandler } from '@proteo/iframe-loader';
import type { HttpRequestPayload } from '../legacy-iframe-events';

export const httpRequestHandler: IframeEventHandler<HttpRequestPayload, DataManagerResponse<unknown>> = async (
  payload: HttpRequestPayload,
  _iframe: HTMLIFrameElement
) => {
  LoggerUtils.getInstance().debug('[httpRequestHandler] request:', payload);

  const request: DataManagerRequest = {
    url: payload.path,
    method: payload.method,
    headers: payload.headers,
    data: payload.body,
    params: payload.params
  };

  try {
    const response = await getDriver('P4')?.http(request);
    LoggerUtils.getInstance().debug('[httpRequestHandler] response:', response);
    return response;
  } catch (error) {
    LoggerUtils.getInstance().debug('[httpRequestHandler] error:', error);
    return error;
  }
};
