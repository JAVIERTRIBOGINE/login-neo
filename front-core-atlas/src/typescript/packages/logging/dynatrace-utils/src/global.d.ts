interface Window {
  bsStartDtNativeHttpTracking: (request: { url: string; frameworkName: string }) => { actionId: number; headers: Record<string, string> };
  bsFinishDtNativeHttpTracking: (actionId: number, errorPayload?: { statusCode: number; message: unknown }) => void;
}
