import { LoggerUtils } from '@proteo/logger-utils';
import { appendElementScript } from '@proteo/script-initialization-util';
import { TealiumInfoDriver } from '@proteo/tag-manager-driver-tealium-info';
import { TealiumTxDriver } from '@proteo/tag-manager-driver-tealium-tx';
import { TealiumTxP4Driver } from '@proteo/tag-manager-driver-tealium-tx-p4';
import { TagManager } from '@proteo/tag-manager';
import {
  COOKIES_MANAGER_CONFIG,
  type BaseAppConfig,
  type BootstrapDrivers,
  type ITagManagerDriver,
  type TM_AVAILABLE_DRIVERS,
  type TagManagerConfiguration,
  type TagDriverConfig
} from '@proteo/types';
import { getEnvironment } from '@proteo/environment-detection-utils';

/**
 * The function checks if cookies policy has been initialize
 * @param config base configuration request information
 * @returns {Promise<boolean>} boolean response
 */
export function initializeCookiesPolicy(config: BaseAppConfig): Promise<boolean> {
  const environment = getEnvironment();
  return new Promise((resolve, reject) => {
    const cookiesManager = config.COOKIES_MANAGER_CONFIG ? config.COOKIES_MANAGER_CONFIG.ACTIVATED : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!cookiesManager) {
      LoggerUtils.getInstance().error('[Cookies Policy Utils] Missing configuration', {
        remoteLogger: true,
        type: 'application'
      });
      reject(false);
      return;
    } else if (document.querySelector('#cookieLaw')) {
      LoggerUtils.getInstance().error('[Cookies Policy Utils] Already initialized', {
        remoteLogger: true,
        type: 'application'
      });
      reject(false);
      return;
    }

    const scriptOptanon = document.createElement('script');
    scriptOptanon.id = 'scriptOptanon';
    scriptOptanon.textContent = `
      function OptanonWrapper() {
        const customEvent = new Event('event_onetrust');
        window.dispatchEvent(customEvent);
      }
    `;
    appendElementScript(scriptOptanon);

    const scriptCookie = document.createElement('script');
    scriptCookie.id = 'cookieLaw';
    if (config.COOKIES_MANAGER_CONFIG) {
      scriptCookie.src = COOKIES_MANAGER_CONFIG[environment].CDN_URL;
    }
    scriptCookie.type = 'text/javascript';
    appendElementScript(scriptCookie);

    const scriptCookieDomain = document.createElement('script');
    scriptCookieDomain.id = 'cookieLawDomain';
    scriptCookieDomain.type = 'text/javascript';
    if (config.COOKIES_MANAGER_CONFIG) {
      scriptCookieDomain.src = COOKIES_MANAGER_CONFIG[environment].COOKIES_URL;
      scriptCookieDomain.setAttribute('data-domain-script', COOKIES_MANAGER_CONFIG[environment].DATA_DOMAIN);
    }
    appendElementScript(scriptCookieDomain, () => checkOntrustInitializeTagManager(config));

    resolve(true);
  });
}

function checkOntrustInitializeTagManager(config: BaseAppConfig, drivers?: BootstrapDrivers): void {
  window.addEventListener('event_onetrust', () => {
    innerOptanonWrapper(config, drivers);
  });
}

function innerOptanonWrapper(config: BaseAppConfig, drivers?: BootstrapDrivers) {
  LoggerUtils.getInstance().debug(JSON.stringify(config), drivers);

  if (OneTrust.IsAlertBoxClosedAndValid()) {
    LoggerUtils.getInstance().debug('[Cookies Policy Utils] executing Onetrust IsAlertBoxClosedAndValid', {
      remoteLogger: true,
      type: 'application'
    });
    LoggerUtils.getInstance().debug('[Cookies Policy Utils] initializing Tag Manager', {
      remoteLogger: true,
      type: 'application'
    });

    const TM_AVAILABLE_DRIVERS_CLASS: Record<TM_AVAILABLE_DRIVERS, ITagManagerDriver> = {
      TX: new TealiumTxDriver(),
      INFO: new TealiumInfoDriver(),
      TXP4: new TealiumTxP4Driver()
    };
    if (config.TAG_MANAGER_CONFIG) {
      const tagManagerConf: Record<string, TagManagerConfiguration> = {};
      config.TAG_MANAGER_CONFIG?.DRIVERS.forEach((driverConfig: TagDriverConfig) => {
        if (driverConfig.DRIVER) {
          tagManagerConf[driverConfig.DRIVER] = {
            driver: TM_AVAILABLE_DRIVERS_CLASS[driverConfig.DRIVER],
            class: driverConfig.CLASS || []
          };
        }
      });
      TagManager.initInstance(tagManagerConf, false);
    }
  }
}
