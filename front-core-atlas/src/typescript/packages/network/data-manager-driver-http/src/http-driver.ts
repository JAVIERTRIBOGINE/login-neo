import { GenericDriver } from '@proteo/data-manager-driver';
import type { DriverConfiguration } from '@proteo/types';
import { HttpWebDriver } from './http-web-driver.js';
import { HttpNativeDriver } from './http-native-driver.js';
import { LoggerUtils } from '@proteo/logger-utils';
import { isNative } from '@proteo/platform-utils';

/**
 * Http Driver for performing HTTP requests and returning
 * Data manager responses
 */
export class HttpDriver extends GenericDriver {
  constructor(config?: DriverConfiguration) {
    super(config, false);
    if (isNative()) {
      LoggerUtils.getInstance().debug('Using PROTEO 4 driver with NATIVE implementation', {
        remoteLogger: true,
        type: 'application'
      });
      this.instance = new HttpNativeDriver(config);
    } else {
      LoggerUtils.getInstance().debug('Using PROTEO 4 driver with WEB implementation', {
        remoteLogger: true,
        type: 'application'
      });
      this.instance = new HttpWebDriver(config);
    }
  }
}
