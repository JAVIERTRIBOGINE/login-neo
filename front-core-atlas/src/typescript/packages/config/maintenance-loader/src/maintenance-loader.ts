import { I18n } from '@proteo/i18n-utils';
import { LoggerUtils } from '@proteo/logger-utils';
import { isNative } from '@proteo/platform-utils';
import type { MaintenanceLoaderConf } from '@proteo/types';

/**
 * Configuration Loader implementation. It Loads the global configuration for an app.
 * It accepts to override the default config, for example to indicate the host or config path for a mFe
 */

const BASE_PATH = '/app/maintenance/v0/';

/**
 * Checks the maintenance config and makes the navigation in case of having it active
 * @param config Object with all the configs merged (env.json, runtime.json, ...)
 */
export const checkMaintenanceConfig = (config: MaintenanceLoaderConf) => {
  if (config.MAINTENANCE_CONFIG && config.MAINTENANCE_CONFIG.ENABLED) {
    LoggerUtils.getInstance().debug(
      `[ShellBrowserPlatform] bootstrap: MAINTENANCE_CONFIG.ENABLED: ${config.MAINTENANCE_CONFIG.ENABLED}`,
      {
        remoteLogger: true,
        type: 'application'
      }
    );
    const lang = I18n.getInstance().language;
    const basePath = (config.MAINTENANCE_CONFIG.HOST || '') + BASE_PATH;
    const url = `${basePath}?isMobile=${isNative()}&lang=${lang}&cause=${config.MAINTENANCE_CONFIG.CAUSE}`;
    window.location.assign(url);
  }
};
