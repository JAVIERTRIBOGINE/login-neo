import { EnumEnvironments } from '@proteo/types';

const DYNATRACE_JS_BASE_URL = 'https://dynatrace.bancsabadell.mobi/jstag/managed/';
export const DYNATRACE_JS = {
  [EnumEnvironments.INT]: `${DYNATRACE_JS_BASE_URL}cfccaeba-f2fc-45b7-932f-7e61fcd14c70/7003db84c8310787_complete.js`,
  [EnumEnvironments.PRE]: `${DYNATRACE_JS_BASE_URL}cfccaeba-f2fc-45b7-932f-7e61fcd14c70/7c15d0f0abea61bb_complete.js`,
  [EnumEnvironments.PRO]: `${DYNATRACE_JS_BASE_URL}457cbb7d-56e0-4b0d-9b62-8f4ad840445e/aafcba18468ee34d_complete.js`
};

const CDN_HOST = {
  [EnumEnvironments.INT]: 'https://apps.cdn.int.aws.bancsabadell.com/',
  [EnumEnvironments.PRE]: 'https://apps.cdn.pre.aws.bancsabadell.com/',
  [EnumEnvironments.PRO]: 'https://apps.cdn.aws.bancsabadell.com/'
};

const DYNATRACE_NATIVE_WRAPPER_PATH = 'conf/app/lib-dyna-P4/v0/dynatrace-native-tracker.js';

export const DYNATRACE_NATIVE_WRAPPER_JS = {
  [EnumEnvironments.INT]: `${CDN_HOST[EnumEnvironments.INT]}${DYNATRACE_NATIVE_WRAPPER_PATH}`,
  [EnumEnvironments.PRE]: `${CDN_HOST[EnumEnvironments.PRE]}${DYNATRACE_NATIVE_WRAPPER_PATH}`,
  [EnumEnvironments.PRO]: `${CDN_HOST[EnumEnvironments.PRO]}${DYNATRACE_NATIVE_WRAPPER_PATH}`
};
