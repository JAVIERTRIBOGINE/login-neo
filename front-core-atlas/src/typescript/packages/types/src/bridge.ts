import type {
  ActionButtonActiveEventResponsePayload,
  AddEventCalendarPayload,
  CloseWithBackdropEventResponsePayload,
  CopyTextEventPayload,
  DownloadFileEventPayload,
  EnableScreenCapturePayload,
  GetSharedPreferencesPayload,
  InitEventPayload,
  NavigateToEventPayload,
  OpenDialogEventPayload,
  OpenOperativeEventPayload,
  OpenWithBackdropEventPayload,
  RefreshTokensEventPayload,
  ResizeEventPayload,
  SaveSharedPreferencesPayload,
  ScrollToEventPayload,
  ShareEventPayload,
  SignOperativeEventPayload,
  ToastEventPayload,
  UserSurveyEventPayload,
  OpenMapsPayload,
  GetPermissionPayload,
  OnPrePermissionPayload,
  PhoneCallBridgePayload,
  DeleteSharedPreferencesPayload,
  DeleteAllSharedPreferencesPayload,
  ClearOptanonConsentsPayload
} from './bridge-events.js';
import type { DataManagerRequest } from './data-manager.js';

export type NativeCallback = (payload?: BridgeRequest) => void;

/**
 * The event bus name for subscribe action
 */
export const EVENT_BRIDGE_BROADCAST = 'proteoEventBridgeBroadcast';

export interface NativeResponse {
  detail: string;
}

export interface BridgeRequest {
  method: string;
  data?: unknown;
}

export type WebBridgeRequest = {
  operation: string;
  callbackId?: string;
  data: unknown;
};

export type WebBridgeResponse = {
  operation: string;
  callbackId: string;
  data: unknown;
};

export type BranchesBridgeRequest = {
  operation: string;
  callbackId: string;
  data: unknown;
};

/**
 * BASE ARQ BRIDGE EVENTS REQUESTS
 */

export type InitBridgeRequest = BridgeRequest & {
  method: 'initBridge';
  data: InitEventPayload;
};

export type OpenOperativeBridgeRequest = BridgeRequest & {
  method: 'openOperative';
  data: OpenOperativeEventPayload;
};

export type SignOperativeBridgeRequest = OpenOperativeBridgeRequest & {
  data: SignOperativeEventPayload;
};

export type DownloadFileBridgeRequest = BridgeRequest & {
  method: 'downloadFile';
  data: DownloadFileEventPayload;
};

export type OpenDialogBridgeRequest = BridgeRequest & {
  method: 'openDialog';
  data: OpenDialogEventPayload;
};

export type ShareBridgeRequest = BridgeRequest & {
  method: 'share';
  data: ShareEventPayload;
};

export type ToastBridgeRequest = BridgeRequest & {
  method: 'toast';
  data: ToastEventPayload;
};

export type RefreshTokensBridgeRequest = BridgeRequest & {
  method: 'refreshTokens';
  data: RefreshTokensEventPayload;
};

export type AuthPayload = {
  clientId?: string;
  redirectUri?: string;
};

export type RequestRefreshTokensBridgeRequest = BridgeRequest & {
  method: 'requestRefreshTokens';
  data?: AuthPayload;
};

export type DOMResizeBridgeRequest = BridgeRequest & {
  method: 'domResize';
  data: ResizeEventPayload;
};

export type DOMScrollToBridgeRequest = BridgeRequest & {
  method: 'domScrollTo';
  data: ScrollToEventPayload;
};

export type DOMNavigateToBridgeRequest = BridgeRequest & {
  method: 'domNavigateTo';
  data: NavigateToEventPayload;
};

export type KeepAliveToBridgeRequest = BridgeRequest & {
  method: 'keepAlive';
};

export type OpenWithBackdropBridgeRequest = BridgeRequest & {
  method: 'openWithBackdrop';
  data: OpenWithBackdropEventPayload;
};

export type CloseWithBackdropBridgeRequest = BridgeRequest & {
  method: 'closeWithBackdrop';
  data: CloseWithBackdropEventResponsePayload;
};

export type ActionButtonActiveBridgeRequest = BridgeRequest & {
  method: 'actionButtonActive';
  data: ActionButtonActiveEventResponsePayload;
};

export type UserSurveyBridgeRequest = BridgeRequest & {
  method: 'userSurvey';
  data: UserSurveyEventPayload;
};

export type CopyTextEventRequest = BridgeRequest & {
  method: 'copyText';
  data: CopyTextEventPayload;
};

export type PhoneCallBridgeRequest = BridgeRequest & {
  method: 'phoneCall';
  data: PhoneCallBridgePayload;
};

export type SaveSharedPreferencesRequest = BridgeRequest & {
  method: 'saveSharedPreferences';
  data: SaveSharedPreferencesPayload;
};

export type GetSharedPreferencesRequest = BridgeRequest & {
  method: 'getSharedPreferences';
  data: GetSharedPreferencesPayload;
};

export type DeleteSharedPreferencesRequest = BridgeRequest & {
  method: 'deleteSharedPreferences';
  data: DeleteSharedPreferencesPayload;
};

export type DeleteAllSharedPreferencesRequest = BridgeRequest & {
  method: 'deleteAllSharedPreferences';
  data: DeleteAllSharedPreferencesPayload;
};

export type AddEventCalendarRequest = BridgeRequest & {
  method: 'addEventCalendar';
  data: AddEventCalendarPayload;
};

export type EnableScreenCaptureRequest = BridgeRequest & {
  method: 'enableScreenCapture';
  data: EnableScreenCapturePayload;
};

export type OpenMapsRequest = BridgeRequest & {
  method: 'openMaps';
  data: OpenMapsPayload;
};

export type StartLoadRequest = BridgeRequest & {
  method: 'startLoad';
};

export type FinishLoadRequest = BridgeRequest & {
  method: 'finishLoad';
};

export type GetPermissionRequest = BridgeRequest & {
  method: 'getPermission';
  data: GetPermissionPayload;
};

export type GetPermissionsRequest = BridgeRequest & {
  method: 'getPermissions';
};

export type OnPrePermissionRequest = BridgeRequest & {
  method: 'onPrePermission';
  data: OnPrePermissionPayload;
};

export type ClearOptanonConsentsRequest = BridgeRequest & {
  method: 'clearConsents';
  data: ClearOptanonConsentsPayload;
};

export interface BaseBridgeEvents {
  INIT: InitBridgeRequest;
  OPEN_OPERATIVE: OpenOperativeBridgeRequest;
  SIGN: SignOperativeBridgeRequest;
  DOWNLOAD_FILE: DownloadFileBridgeRequest;
  OPEN_DIALOG: OpenDialogBridgeRequest;
  SHARE: ShareBridgeRequest;
  TOAST: ToastBridgeRequest;
  REFRESH_TOKENS: RefreshTokensBridgeRequest;
  REQUEST_REFRESH_TOKENS: RequestRefreshTokensBridgeRequest;
  DOM_RESIZE: DOMResizeBridgeRequest;
  DOM_SCROLL_TO: DOMScrollToBridgeRequest;
  DOM_NAVIGATE_TO: DOMNavigateToBridgeRequest;
  KEEP_ALIVE: KeepAliveToBridgeRequest;
  OPEN_WITH_BACKDROP: OpenWithBackdropBridgeRequest;
  CLOSE_WITH_BACKDROP: CloseWithBackdropBridgeRequest;
  ACTION_BUTTON_ACTIVE: ActionButtonActiveBridgeRequest;
  USER_SURVEY: UserSurveyBridgeRequest;
  COPY_TEXT: CopyTextEventRequest;
  PHONE_CALL: PhoneCallBridgeRequest;
  SAVE_SHARED_PREFERENCES: SaveSharedPreferencesRequest;
  GET_SHARED_PREFERENCES: GetSharedPreferencesRequest;
  DELETE_SHARED_PREFERENCES: DeleteSharedPreferencesPayload;
  DELETE_ALL_SHARED_PREFERENCES: DeleteAllSharedPreferencesPayload;
  ADD_EVENT_CALENDAR: AddEventCalendarRequest;
  ENABLE_SCREEN_CAPTURE: EnableScreenCaptureRequest;
  OPEN_MAPS: OpenMapsRequest;
  START_LOAD: StartLoadRequest;
  FINISH_LOAD: FinishLoadRequest;
  GET_PERMISSION: GetPermissionRequest;
  GET_PERMISSIONS: GetPermissionsRequest;
  ON_PRE_PERMISSION: OnPrePermissionRequest;
  CLEAR_OPTANON_CONSENTS: ClearOptanonConsentsRequest;
}

interface WebkitMessageHandler {
  postMessage: (message: unknown) => void;
}

export interface Webkit {
  messageHandlers: {
    [key: string]: WebkitMessageHandler;
  };
}

export type WindowBSMBridgeMethod = (callbackId: string, data: string) => void;
type WindowBSMBridgeOperationMethod = (operation: string, callbackId: string, data: string) => void;

export interface WindowBSMBridge {
  processMessage?: WindowBSMBridgeOperationMethod;
  [operation: string]: WindowBSMBridgeMethod | WindowBSMBridgeOperationMethod | undefined;
}

export interface NativeEvent {
  data: unknown;
}

export type BranchesOperation = (request: BranchesBridgeRequest) => void;
type MsgOperation = (msg: string) => void;

export interface EclipseDesktop {
  send?: MsgOperation;
  sendP4?: MsgOperation;
}

export interface BridgeHttpRequest extends DataManagerRequest {
  body?: unknown;
}

export interface EeNativeOperationPayload {
  type?: string;
  msg?: string;
}
