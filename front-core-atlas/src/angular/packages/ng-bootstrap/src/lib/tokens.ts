import { InjectionToken } from '@angular/core';
import { InitEventResponsePayload, MicrofrontendMetadata } from '@proteo/types';

/**
 * Token to store global configuration
 * @example constructor(@Optional() @Inject(PROTEO_APP_CONF) private config: AppConfigType)
 */
export const PROTEO_APP_CONF = new InjectionToken<unknown>('PROTEO_APP_CONF');

/**
 * Token to retrieve external mfe information such us host and base path configuration
 */
export const PROTEO_MFE_CONF = new InjectionToken<MicrofrontendMetadata>('PROTEO_MFE_CONF');

/**
 * Token to retrieve external data send into the INIT event of the bootstrap module
 * @example constructor(@Optional() @Inject(PROTEO_4_INIT_EXTERNAL_DATA) private initData: AppInitConfig)
 */
export const PROTEO_4_INIT_EXTERNAL_DATA = new InjectionToken<unknown>('PROTEO_4_INIT_EXTERNAL_DATA');

/**
 * Token to retrieve shared data between micro frontends and shell portals
 * @example constructor(@Optional() @Inject(PROTEO_4_INIT_SHARED_DATA) private sharedData: unknown)
 */
export const PROTEO_4_INIT_SHARED_DATA = new InjectionToken<unknown>('PROTEO_4_INIT_SHARED_DATA');

/**
 * Token to retrieve init data between micro frontends and shell portals
 * @example constructor(@Optional() @Inject(PROTEO_4_INIT_DATA) private initData: InitEventResponsePayload)
 */
export const PROTEO_4_INIT_DATA = new InjectionToken<InitEventResponsePayload>('PROTEO_4_INIT_DATA');
