import { InjectionToken } from '@angular/core';
import { Routes } from '@angular/router';
import { BsApplicationList, BSauthRoutesConfig, BSulMappingConfig } from './models/dynamic-routing.model';
import { InitEventResponsePayload } from '@proteo/types';

export const LOCAL_ROUTES = new InjectionToken<Routes>('LOCAL_ROUTES');
export const DYNAMIC_ROUTES = new InjectionToken<BsApplicationList>('DYNAMIC_ROUTES');
export const ROOT_PATH = new InjectionToken<string>('ROOT_PATH');
export const ERROR_ROUTE_PATH = new InjectionToken<string>('ERROR_ROUTE_PATH');
export const AUTH_CONFIG = new InjectionToken<BSauthRoutesConfig>('AUTH_CONFIG');
export const UL_MAPPING = new InjectionToken<BSulMappingConfig>('UL_MAPPING');
export const PROTEO_4_INIT_DATA = new InjectionToken<InitEventResponsePayload>('PROTEO_4_INIT_DATA');
