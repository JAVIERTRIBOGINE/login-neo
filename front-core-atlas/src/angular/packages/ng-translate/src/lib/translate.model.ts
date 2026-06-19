import { StringMap } from '@proteo/types';

export type TranslateModuleConfig = {
  namespace: string;
  translations: StringMap;
  defaultLang?: string;
};
