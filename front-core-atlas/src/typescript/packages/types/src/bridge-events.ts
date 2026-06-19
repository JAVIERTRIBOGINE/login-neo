/**
 * ----------------------------------------------------------------------------
 * BRIDGE EVENTS SPECIFICATIONS
 * ----------------------------------------------------------------------------
 * The Basic architecture events are:
 *
 *  - INIT
 *  - OPEN OPERATIVE
 *  - DOWNLOAD FILE
 *  - refresh
 *  - DOM EVENTS
 *    - resize
 *    - scrollTo
 *    - hostClick
 *    - navigateTo
 */

import type { AuthorizationTokens } from './data-manager.js';
import type { DeviceInfoData } from './event-bus.js';
import type { DataLayerTXP4 } from './tag-manager-drivers.js';

/**
 * Base Event Payload type. Every event must
 * extends at least from this type or a child
 */
export type BaseBridgeEventPayload = {
  version: string;
  appID: string;
};

/**
 * ----------------------------------------------------------------------------
 * INIT
 * ----------------------------------------------------------------------------
 */

/**
 * Initialization Event (Host > Parent)
 */
export type InitEventPayload = Partial<BaseBridgeEventPayload> & {
  platform: string;
  moduleDescription: string;
  clientId?: string;
  redirectUri?: string;
};

/**
 * Initialization Event Response (Parent > Host)
 */
export type InitEventResponsePayload = {
  language: string;
  auth?: AuthorizationTokens;
  externalData?: unknown;
  initParameters?: unknown;
  analytics?: DataLayerTXP4['globalInfo'];
  userInfo?: string;
  deviceInfo?: DeviceInfoData;
};

/**
 * ----------------------------------------------------------------------------
 * OPEN OPERATIVE
 * ----------------------------------------------------------------------------
 */

/**
 * Open Operative Event (Host > Parent)
 */
export type OpenOperativeEventPayload = Partial<BaseBridgeEventPayload> & {
  operativeName: string;
  mode?: 'fullscreen' | 'popover' | 'navigationWithoutNavBar';
  externalData?: unknown;
};

/**
 * Open Operative Event (Parent > Host)
 */
export type OpenOperativeEventResponsePayload = OpenOperativeEventPayload;

/**
 * ----------------------------------------------------------------------------
 * SIGN
 * ----------------------------------------------------------------------------
 */

/**
 * Sign Operative Event (Host > Parent)
 */
export type SignOperativeEventPayload = OpenOperativeEventPayload & {
  operativeName: 'openOp/signature';
};

/**
 * ----------------------------------------------------------------------------
 * DOWNLOAD FILE
 * ----------------------------------------------------------------------------
 */

/**
 * File Model
 */
type FileEventData = {
  fileName: string;
  fileExtension: string;
  fileData: string;
};

/**
 * File URl Model
 */
type FileEventURLData = {
  fileURL: string;
};

/**
 * Download File Event (Host > Parent)
 */
export type DownloadFileEventPayload = Partial<BaseBridgeEventPayload> &
  (FileEventData | FileEventURLData) & {
    share?: boolean;
  };

/**
 * Download File Event (Parent > Host)
 */
export type DownloadFileEventResponsePayload = Partial<BaseBridgeEventPayload> & {
  url: string;
};

/**
 * ----------------------------------------------------------------------------
 * OPEN DIALOG
 * ----------------------------------------------------------------------------
 */

/**
 * Open Dialog Event (Host > Parent)
 */
export type OpenDialogEventPayload = Partial<BaseBridgeEventPayload> & {
  title: string;
  description?: string;
  okButtonText: string;
  cancelButtonText?: string;
};

/**
 * Open Dialog Event (Parent > Host)
 */
export type OpenDialogEventResponsePayload = Partial<BaseBridgeEventPayload> & {
  userFeedback: boolean;
};

/**
 * ----------------------------------------------------------------------------
 * SHARE
 * ----------------------------------------------------------------------------
 */

/**
 * Share Event (Host > Parent)
 */
export type ShareEventPayload = Partial<BaseBridgeEventPayload> & {
  text?: string;
  url?: string;
  title?: string;
};

/**
 * Share Event (Parent > Host)
 */
export type ShareEventResponsePayload = Partial<BaseBridgeEventPayload> & {
  status: boolean;
};

/**
 * ----------------------------------------------------------------------------
 * TOAST
 * ----------------------------------------------------------------------------
 */

/**
 * Share Event (Host > Parent)
 */
export type ToastEventPayload = Partial<BaseBridgeEventPayload> & {
  message?: string;
};

/**
 * ----------------------------------------------------------------------------
 * REFRESH
 * ----------------------------------------------------------------------------
 */

/**
 * Refresh Event (Host > Parent)
 */
export type RefreshTokensEventPayload = Partial<BaseBridgeEventPayload>;

/**
 * Refresh Event Response (Parent > Host)
 */
export type RefreshTokensEventResponsePayload = AuthorizationTokens & { error?: string };

/**
 * ----------------------------------------------------------------------------
 * DOM EVENTS
 * ----------------------------------------------------------------------------
 */

/**
 * Resize event payload (Host > Parent)
 */
export type ResizeEventPayload = Partial<BaseBridgeEventPayload> & {
  height: number;
};

/**
 * Scroll To event payload (Host > Parent)
 */
export type ScrollToEventPayload = Partial<BaseBridgeEventPayload> & {
  x: number;
  y: number;
};

/**
 * Navigate To event payload (Host > Parent)
 */
export type NavigateToEventPayload = Partial<BaseBridgeEventPayload> & {
  url: string;
  blank: boolean;
};

/**
 * ----------------------------------------------------------------------------
 * OPEN WITH BACKDROP
 * ----------------------------------------------------------------------------
 */

/**
 * Share Event (Host > Parent)
 */
export type OpenWithBackdropEventPayload = Partial<BaseBridgeEventPayload> & {
  type: 'modal' | 'drawer';
  instance: string;
};

/**
 * Share Event (Parent > Host)
 */
export type CloseWithBackdropEventResponsePayload = Partial<BaseBridgeEventPayload> & {
  additionalData?: unknown;
};

/**
 * Share Event (Parent > Host)
 */
export type ActionButtonActiveEventResponsePayload = Partial<BaseBridgeEventPayload> & {
  action: string;
  additionalData?: unknown;
};

/**
 * ----------------------------------------------------------------------------
 * USER SURVEY
 * ----------------------------------------------------------------------------
 */

/**
 * User survey Event (Host > Parent)
 */
export type UserSurveyEventPayload = Partial<BaseBridgeEventPayload> & {
  applicationIdentifier: string;
  additionalData?: unknown;
};

/**
 * UserSurvey Event (Parent > Host)
 */
export type UserSurveyEventResponsePayload = Partial<BaseBridgeEventPayload> & {
  data: unknown;
};

/**
 * ----------------------------------------------------------------------------
 * COPY TEXT
 * ----------------------------------------------------------------------------
 */

/**
 * Copy Text Event (Host > Parent)
 */
export type CopyTextEventPayload = Partial<BaseBridgeEventPayload> & {
  textToCopy: string;
  externalData?: unknown;
};

/**
 * ----------------------------------------------------------------------------
 * PHONE CALL
 * ----------------------------------------------------------------------------
 */

/**
 * Phone Call Event (Host > Parent)
 */
export type PhoneCallBridgePayload = Partial<BaseBridgeEventPayload> & {
  phoneNumber: string;
};

/**
 * ----------------------------------------------------------------------------
 * SAVE SHARED PREFERENCES
 * ----------------------------------------------------------------------------
 */

/**
 * Save Shared Preferences Event (Parent > Host)
 */
export type SaveSharedPreferencesPayload = Partial<BaseBridgeEventPayload> & {
  key: string;
  value: string;
};

/**
 * ----------------------------------------------------------------------------
 * GET SHARED PREFERENCES
 * ----------------------------------------------------------------------------
 */

/**
 * GET Shared Preferences Event (Host > Parent)
 */
export type GetSharedPreferencesPayload = Partial<BaseBridgeEventPayload> & {
  key: string;
};

/**
 * GET Shared Preferences Event (Parent > Host)
 */
export type GetSharedPreferencesPayloadResponse = Partial<BaseBridgeEventPayload> & {
  value: string;
};

/**
 * ----------------------------------------------------------------------------
 * DELETE SHARED PREFERENCES
 * ----------------------------------------------------------------------------
 */

/**
 * Delete Shared Preferences Event (Parent > Host)
 */
export type DeleteSharedPreferencesPayload = Partial<BaseBridgeEventPayload> & {
  key: string;
};

/**
 * ----------------------------------------------------------------------------
 * DELETE ALL SHARED PREFERENCES
 * ----------------------------------------------------------------------------
 */

/**
 * Delete All Shared Preferences Event (Parent > Host)
 */
export type DeleteAllSharedPreferencesPayload = Partial<BaseBridgeEventPayload>;

/**
 * ----------------------------------------------------------------------------
 * ADD EVENT CALENDAR
 * ----------------------------------------------------------------------------
 */

/**
 * Add Event Calendar Event (Host > Parent)
 */
export type AddEventCalendarPayload = Partial<BaseBridgeEventPayload> & {
  title: string;
  description?: string;
  startInMillis: number;
  endInMillis: number;
};

/**
 * Add Event Calendar Event (Parent > Host)
 */
export type AddEventCalendarResponsePayload = Partial<BaseBridgeEventPayload> & {
  status: boolean;
  errorDescription?: string;
};

/**
 * ----------------------------------------------------------------------------
 * ENABLE SCREEN CAPTURE
 * ----------------------------------------------------------------------------
 */

/**
 * Enable Screen Capture Event (Host > Parent)
 */
export type EnableScreenCapturePayload = Partial<BaseBridgeEventPayload> & {
  title: string;
  message: string;
  buttonTitle: string;
};

/**
 * Enable Screen Capture Event (Parent > Host)
 */
export type EnableScreenCaptureResponsePayload = Partial<BaseBridgeEventPayload> & {
  status: boolean;
  errorDescription?: string;
};

/**
 * ----------------------------------------------------------------------------
 * OPEN MAPS
 * ----------------------------------------------------------------------------
 */

/**
 * Open Maps Event (Host > Parent)
 */
export type OpenMapsPayload = Partial<BaseBridgeEventPayload> & {
  latitude: string;
  longitude: string;
  query?: string;
};

/**
 * Open Maps Event (Parent > Host)
 */
export type OpenMapsResponsePayload = Partial<BaseBridgeEventPayload> & {
  status: boolean;
  errorDescription?: string;
};

/**
 * ----------------------------------------------------------------------------
 * PERMISSIONS MANAGER
 * ----------------------------------------------------------------------------
 */

/**
 * Get Permission Event (Host > Parent)
 */
export type GetPermissionPayload = Partial<BaseBridgeEventPayload> & {
  permissionId: string;
};

/**
 * Get Permission Event (Parent > Host)
 */
export type GetPermissionResponsePayload = Partial<BaseBridgeEventPayload> & {
  permissionId: string;
  prePermissionLogs: Record<string, string>;
  permissionLogs: Record<string, string>;
  status: string;
};

/**
 * Get Permissions Event (Parent > Host)
 */

export type GetPermissionsResponsePayload = Partial<BaseBridgeEventPayload> & {
  permissions: GetPermissionResponsePayload[];
};

/**
 * On Pre Permission Event (Host > Parent)
 */
export type OnPrePermissionPayload = Partial<BaseBridgeEventPayload> & {
  permissionId: string;
  event: string;
};

/**
 * ----------------------------------------------------------------------------
 * USER INFO
 * ----------------------------------------------------------------------------
 */

export type UserInfoEventResponse = {
  userInfo: string;
};

/**
 * ----------------------------------------------------------------------------
 * LOGIN ACCESS TYPE
 * ----------------------------------------------------------------------------
 */

export type LoginAccessTypeEventResponse = {
  acceso: string;
};

/**
 * ----------------------------------------------------------------------------
 * OPTANON CONSENTS
 * ----------------------------------------------------------------------------
 */

/**
 * Clear cookie consents
 */
export type ClearOptanonConsentsPayload = Partial<BaseBridgeEventPayload>;
