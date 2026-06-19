import { LoggerUtils } from '@proteo/logger-utils';
import { getEnvironment } from '@proteo/environment-detection-utils';
import { appendElementScript } from '@proteo/script-initialization-util';
import { type BaseAppConfig, RSA_FRAUD_CONFIG, COMMON_JS, HASHTABLE } from '@proteo/types';
import { createUUID } from '@proteo/uuid-utils';

declare let updateDeviceTokenCookie: (uuid: string) => unknown;
declare let add_deviceprint: () => string;
const SCRIPT_TYPE = 'text/javascript';
/**
 * The function initializes RSA & adds all the necessary cookie
 * @param config base configuration request information
 * @returns {Promise<boolean>} boolean response
 */
export function initializeRSA(config: BaseAppConfig): Promise<boolean> {
  const environment = getEnvironment();
  return new Promise((resolve, reject) => {
    if (!config.FRAUD_CONFIG || (config.FRAUD_CONFIG?.RSA && config.FRAUD_CONFIG.RSA.ACTIVATED === false)) {
      LoggerUtils.getInstance().error(
        '[RSA Utils] Can not initialize because your config is set to not initialize RSA',
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

    appendElementScript(commonJSscript, () => tokenCookie())
      .then(() => {
        LoggerUtils.getInstance().debug('[RSA Utils] Device token cookie added', {
          remoteLogger: true,
          type: 'application'
        });
        hashtableScript().then(() => resolve(true));
      })
      .catch((error: [boolean, string]) => {
        LoggerUtils.getInstance().debug('[RSA Utils] CommonJS already exists continuing with the script addition', {
          remoteLogger: true,
          type: 'application'
        });
        const [result, message] = error;
        if (!result && message === 'script-already-included') {
          const cm = document.getElementById('commonJS');
          if (cm) {
            tokenCookie()
              .then(() => {
                hashtableScript().then(() => resolve(true));
              })
              .catch(() => {
                cm.onload = () => {
                  tokenCookie().then(() => {
                    hashtableScript().then(() => resolve(true));
                  });
                };
              });
          }
        }
      });
  });
}

/**
 * Function to create UUID and pass it to the updateDeviceTokenCookie coming from the common.js
 */
function tokenCookie(): Promise<boolean> {
  return new Promise((resolve) => {
    const uuid = createUUID();
    // Function coming from the common.js
    updateDeviceTokenCookie(uuid);
    resolve(true);
  });
}

/**
 * Function to add the hashtable script
 */
function hashtableScript(): Promise<boolean> {
  const environment = getEnvironment();
  return new Promise((resolve) => {
    LoggerUtils.getInstance().debug('[RSA Utils] Adding hashtable script', {
      remoteLogger: true,
      type: 'application'
    });
    const hashtableScriptElement = document.createElement('script');
    hashtableScriptElement.id = 'hashtable';
    hashtableScriptElement.type = SCRIPT_TYPE;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    hashtableScriptElement.src = HASHTABLE[environment];
    appendElementScript(hashtableScriptElement, () => fingerPrintScript()).then(() => resolve(true));
  });
}

/**
 * Function to add the rsa script
 */
function fingerPrintScript(): Promise<boolean> {
  const environment = getEnvironment();
  return new Promise((resolve) => {
    LoggerUtils.getInstance().debug('[RSA Utils] Adding finger print script', {
      remoteLogger: true,
      type: 'application'
    });
    const fingerPrintJSscript = document.createElement('script');
    fingerPrintJSscript.id = 'rsaJS';
    fingerPrintJSscript.type = SCRIPT_TYPE;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    fingerPrintJSscript.src = RSA_FRAUD_CONFIG[environment].RSA_JS;
    appendElementScript(fingerPrintJSscript, () => addFingerPrint()).then(() => resolve(true));
  });
}

/**
 * Function to add the finger print into session storage
 */
function addFingerPrint(): void {
  // Function coming from the rsa.js
  sessionStorage.setItem('deviceprint', add_deviceprint());
}
