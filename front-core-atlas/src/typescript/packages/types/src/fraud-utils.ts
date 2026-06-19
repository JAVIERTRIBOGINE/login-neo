import { BS_HOST, EnumEnvironments } from './proteo.js';

const INFODATA2_HOST = 'https://infodata2.bancsabadell.com';
const COOKIELAW_HOST = 'https://cdn.cookielaw.org';

const COMMON_JS_PATH = '/StaticFiles/GrupoBS/js/commons.js?version=23.10';
export const COMMON_JS = {
  [EnumEnvironments.INT]: `${BS_HOST[EnumEnvironments.INT]}${COMMON_JS_PATH}`,
  [EnumEnvironments.PRE]: `${BS_HOST[EnumEnvironments.PRE]}${COMMON_JS_PATH}`,
  [EnumEnvironments.PRO]: `${BS_HOST[EnumEnvironments.PRO]}${COMMON_JS_PATH}`
};

const RSA_FRAUD_CONFIG_PATH = '/StaticFiles/GrupoBS/js/rsa.js';
export const RSA_FRAUD_CONFIG = {
  [EnumEnvironments.INT]: {
    RSA_JS: `${BS_HOST[EnumEnvironments.INT]}${RSA_FRAUD_CONFIG_PATH}`
  },
  [EnumEnvironments.PRE]: {
    RSA_JS: `${BS_HOST[EnumEnvironments.PRE]}${RSA_FRAUD_CONFIG_PATH}`
  },
  [EnumEnvironments.PRO]: {
    RSA_JS: `${BS_HOST[EnumEnvironments.PRO]}${RSA_FRAUD_CONFIG_PATH}`
  }
};

const HASHTABLE_PATH = '/StaticFiles/GrupoBS/js/hashtable.js';
export const HASHTABLE = {
  [EnumEnvironments.INT]: `${BS_HOST[EnumEnvironments.INT]}${HASHTABLE_PATH}`,
  [EnumEnvironments.PRE]: `${BS_HOST[EnumEnvironments.PRE]}${HASHTABLE_PATH}`,
  [EnumEnvironments.PRO]: `${BS_HOST[EnumEnvironments.PRO]}${HASHTABLE_PATH}`
};

const BIOCATCH_COMMON_CONF = {
  BIOCATCH_JS_LEAN: `${INFODATA2_HOST}/scripts/01c54544/hybridJSFiles/testFiles/jsLean.js`,
  BIOCATCH_JS_MOBILE_IOS: `${INFODATA2_HOST}/scripts/01c54544/hybridJSFiles/testFiles/jsBridge.js`
};

const BIOCATCH_JS_WEB_PATH = '/StaticFiles/GrupoBS/js/7bd2edd0.js';
export const BIOCATCH_FRAUD_CONFIG = {
  [EnumEnvironments.INT]: {
    BIOCATCH_JS_WEB: `${BS_HOST[EnumEnvironments.INT]}${BIOCATCH_JS_WEB_PATH}`,
    ...BIOCATCH_COMMON_CONF
  },
  [EnumEnvironments.PRE]: {
    BIOCATCH_JS_WEB: `${BS_HOST[EnumEnvironments.PRE]}${BIOCATCH_JS_WEB_PATH}`,
    ...BIOCATCH_COMMON_CONF
  },
  [EnumEnvironments.PRO]: {
    BIOCATCH_JS_WEB: `${INFODATA2_HOST}/scripts/01c54544/01c54544ie8v2.js`,
    BIOCATCH_JS_LEAN: `${INFODATA2_HOST}/scripts/01c54544/hybridJSFiles/jsLean.min.js`,
    BIOCATCH_JS_MOBILE_IOS: `${INFODATA2_HOST}/scripts/01c54544/hybridJSFiles/jsBridge.js`
  }
};

const DEFAULT_COOKIES_URL = `${COOKIELAW_HOST}/scripttemplates/otSDKStub.js`;

export const COOKIES_MANAGER_CONFIG = {
  [EnumEnvironments.INT]: {
    CDN_URL: `${COOKIELAW_HOST}/consent/ae74b378-2106-4dfb-964b-6e4ee708a147-test/OtAutoBlock.js`,
    COOKIES_URL: DEFAULT_COOKIES_URL,
    DATA_DOMAIN: 'ae74b378-2106-4dfb-964b-6e4ee708a147-test'
  },
  [EnumEnvironments.PRE]: {
    CDN_URL: `${COOKIELAW_HOST}/consent/ae74b378-2106-4dfb-964b-6e4ee708a147-test/OtAutoBlock.js`,
    COOKIES_URL: DEFAULT_COOKIES_URL,
    DATA_DOMAIN: 'ae74b378-2106-4dfb-964b-6e4ee708a147-test'
  },
  [EnumEnvironments.PRO]: {
    CDN_URL: `${COOKIELAW_HOST}/consent/ae74b378-2106-4dfb-964b-6e4ee708a147/OtAutoBlock.js`,
    COOKIES_URL: DEFAULT_COOKIES_URL,
    DATA_DOMAIN: 'ae74b378-2106-4dfb-964b-6e4ee708a147'
  }
};
