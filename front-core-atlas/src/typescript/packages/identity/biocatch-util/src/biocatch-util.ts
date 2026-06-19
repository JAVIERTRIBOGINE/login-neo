import { EventManager } from '@proteo/event-bus';
import { LoggerUtils } from '@proteo/logger-utils';
import { getEnvironment } from '@proteo/environment-detection-utils';
import { isFullProteo, isIOS, isNative } from '@proteo/platform-utils';
import { getCookie } from '@proteo/cookie-utils';
import { appendElementScript } from '@proteo/script-initialization-util';
import { BIOCATCH_FRAUD_CONFIG, COMMON_JS, type BaseAppConfig } from '@proteo/types';

const SCRIPT_TYPE = 'text/javascript';
const SESSION_COOKIES_ADDED_MESSAGE = '[BioCatch Utils] Session cookies added';
const environment = getEnvironment();

/**
 * Function to initialize BioCtach utility
 * @param config mfe configuration
 * @returns Promise with a boolean value
 */
export function initializeBioCatch(config: BaseAppConfig): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (!config.FRAUD_CONFIG || (config.FRAUD_CONFIG?.BIOCATCH && config.FRAUD_CONFIG.BIOCATCH.ACTIVATED === false)) {
      LoggerUtils.getInstance().error(
        '[BioCatch Utils] Can not initialize because your config is set to not initialize BioCatch',
        {
          remoteLogger: true,
          type: 'application'
        }
      );
      reject(false);
      return;
    }
    const commonJSscript = document.createElement('script');
    commonJSscript.id = 'commonJS';
    commonJSscript.type = SCRIPT_TYPE;
    commonJSscript.src = COMMON_JS[environment];

    function addBioCatchJSResolution() {
      LoggerUtils.getInstance().debug(SESSION_COOKIES_ADDED_MESSAGE, {
        remoteLogger: true,
        type: 'application'
      });
      addBioCatchJS().then(() => resolve(true));
    }

    // Check if this is necessary to do in BSM
    appendElementScript(commonJSscript, () => sessionCookies())
      .then(() => addBioCatchJSResolution())
      .catch((error: [boolean, string]) => {
        const [result, message] = error;
        if (!result && message === 'script-already-included') {
          const cm = document.getElementById('commonJS');
          if (cm) {
            sessionCookies()
              .then(() => addBioCatchJSResolution())
              .catch(() => {
                cm.onload = () => {
                  sessionCookies().then(() => addBioCatchJSResolution());
                };
              });
          }
        }
      });
  });
}

/**
 * Function to initialize BioCtach utility in BSO
 * Note: the script to add is the exact same script that in a native scenario
 * @param config mfe configuration
 * @returns Promise with a boolean value
 */
export function initializeBioCatchBSO(config: BaseAppConfig): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (!config.FRAUD_CONFIG || (config.FRAUD_CONFIG?.BIOCATCH && config.FRAUD_CONFIG.BIOCATCH.ACTIVATED === false)) {
      LoggerUtils.getInstance().error(
        '[BioCatch Utils] Can not initialize because your config is set to not initialize BioCatch',
        {
          remoteLogger: true,
          type: 'application'
        }
      );
      reject(false);
      return;
    }
    const jsLeanScript = document.createElement('script');
    jsLeanScript.id = 'jsLean';
    jsLeanScript.type = 'text/javascript';
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    jsLeanScript.src = BIOCATCH_FRAUD_CONFIG[environment].BIOCATCH_JS_LEAN;

    appendElementScript(jsLeanScript).then(() => {
      LoggerUtils.getInstance().debug('[BioCatch Utils] JavaScript script for BSO included', {
        remoteLogger: true,
        type: 'application'
      });
      resolve(true);
    });
  });
}

/**
 * Function to set the JSESSIONID & JSESSIONID_JBSWL coming from the common.js
 */
function sessionCookies(): Promise<boolean> {
  return new Promise((resolve) => {
    // Function coming from the common.js
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    setJSESSIONID_JBSWL();
    resolve(true);
  });
}

/**
 * Function to add the biocatch script
 */
function addBioCatchJS(): Promise<boolean> {
  const environment = getEnvironment();
  return new Promise((resolve) => {
    LoggerUtils.getInstance().debug('[BioCatch Utils] Adding biocatch script', {
      remoteLogger: true,
      type: 'application'
    });
    if (isNative() && isIOS()) {
      const bioCatchIosJSscript = document.createElement('script');
      bioCatchIosJSscript.id = 'bioCatchIosJS';
      bioCatchIosJSscript.type = SCRIPT_TYPE;
      bioCatchIosJSscript.src = BIOCATCH_FRAUD_CONFIG[environment].BIOCATCH_JS_MOBILE_IOS;
      appendElementScript(bioCatchIosJSscript).then(() => {
        LoggerUtils.getInstance().debug('[BioCatch Utils] JavaScript script for iOS already included', {
          remoteLogger: true,
          type: 'application'
        });
      });
    }
    const bioCatchJSscript = document.createElement('script');
    bioCatchJSscript.id = 'bioCatchJS';
    bioCatchJSscript.type = SCRIPT_TYPE;
    if (isNative()) {
      bioCatchJSscript.src = BIOCATCH_FRAUD_CONFIG[environment].BIOCATCH_JS_LEAN;
    } else if (!isNative()) {
      bioCatchJSscript.src = BIOCATCH_FRAUD_CONFIG[environment].BIOCATCH_JS_WEB;
    }
    appendElementScript(bioCatchJSscript, () => emitBSMevent()).then(() => {
      LoggerUtils.getInstance().debug('[BioCatch Utils] JavaScript script for Mobile already included', {
        remoteLogger: true,
        type: 'application'
      });
      resolve(true);
    });
  });
}

/**
 * Function to emit event to BSM informing the script is ready & loaded
 */
function emitBSMevent(): void {
  if (isNative()) {
    const payload = {
      method: 'biocatchReady',
      data: {
        ready: true
      }
    };
    EventManager.getInstance().publish('BIOCATCH_READY', payload);
  }
  if (isFullProteo()) {
    const JSESSIONID_JBSWL = getCookie('JSESSIONID_JBSWL');
    if (JSESSIONID_JBSWL) {
      // Function coming from the biocatch script
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      cdApi.setCustomerSessionId(JSESSIONID_JBSWL);
    }
  }
}
