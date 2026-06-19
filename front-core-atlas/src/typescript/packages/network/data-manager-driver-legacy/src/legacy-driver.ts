import { GenericDriver } from '@proteo/data-manager-driver';
import { LoggerUtils } from '@proteo/logger-utils';
import { isNative } from '@proteo/platform-utils';
import type { AuthorizationTokens, DriverConfiguration, HttpMethod } from '@proteo/types';
import { LegacyNativeDriver } from './legacy-native-driver.js';
import { LegacyWebDriver } from './legacy-web-driver.js';
export class LegacyDriver extends GenericDriver {
  /**
   * Constructor for class
   * @param config Driver configuration
   */
  constructor(config?: DriverConfiguration) {
    super(config, false);
    if (isNative()) {
      LoggerUtils.getInstance().debug('Using LEGACY driver with NATIVE implementation', {
        remoteLogger: true,
        type: 'application'
      });
      this.instance = new LegacyNativeDriver(config);
    } else {
      LoggerUtils.getInstance().debug('Using LEGACY with WEB implementation', {
        remoteLogger: true,
        type: 'application'
      });
      this.instance = new LegacyWebDriver(config);
    }
  }

  /**
   * Set authorization tokens into closure method for data manager
   * @param authorizationTokens Authorization tokens object
   * @returns {void}
   */
  setAuthorization(authorizationTokens: AuthorizationTokens): void {
    this.instance.setAuthorization(authorizationTokens);
  }

  /**
   * Clear authorization tokens for data manager
   * @returns {void}
   */
  clearTokens(): void {
    this.instance.clearTokens();
  }

  /**
   * Returns if the app has tokens or not
   * @returns {boolean}
   */
  hasTokens(): boolean {
    return this.instance.getHasTokens;
  }

  /**
   * Generate the headers for the request with Proteo4 mandatory headers
   * @param headers Initial request headers
   * @param method Request method
   * @returns {Record<string, string>} Joined request headers
   */
  getHeaders(headers: Record<string, string>, method: HttpMethod): Record<string, string> {
    return this.instance.getHeaders(headers, method);
  }
}
