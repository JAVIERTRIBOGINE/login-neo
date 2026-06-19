import { InjectionToken } from '@angular/core';
import { StringMap } from '@proteo/types';

export const DEFAULT_LANGUAGE = new InjectionToken<string>('DEFAULT_LANGUAGE');
export const INITIAL_NAMESPACE = new InjectionToken<string>('INITIAL_NAMESPACE');
export const INITIAL_TRANSLATIONS = new InjectionToken<StringMap>('INITIAL_TRANSLATIONS');
export const PROTEO_4_INIT_LANG = new InjectionToken<string>('PROTEO_4_INIT_LANG');
