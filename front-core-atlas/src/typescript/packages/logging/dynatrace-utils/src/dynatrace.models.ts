export interface NativeRequestParams {
  url: string;
  frameworkName: string;
  requestId: string;
}

export interface NativeRequestTrackingInfo {
  actionId: number;
  headers: Record<string, string>;
}

export interface NativeRequestError {
  statusCode: number;
  message: unknown;
}
