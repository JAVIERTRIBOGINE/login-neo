import type { DataManagerDriver } from '@proteo/data-manager-driver';
import type { Proteo4Driver } from '@proteo/data-manager-driver-proteo4';
import type { AvailableDrivers, DriverConfiguration } from '@proteo/types';

/**
 * Available drivers constants
 */

export const DEFAULT_DRIVER: AvailableDrivers = 'P4';

export const DATAMANAGER_CONFIG_DEFAULT_NAME = 'DEFAULT';

/**
 * Available driver instance classes for Proteo4
 */
export const AVAILABLE_DRIVERS_CLASS: Record<
  AvailableDrivers,
  (config: DriverConfiguration) => Promise<DataManagerDriver | Proteo4Driver>
> = {
  P4: (config) => import('@proteo/data-manager-driver-proteo4').then((m) => new m.Proteo4Driver(config)),
  LEGACY: (config) => import('@proteo/data-manager-driver-legacy').then((m) => new m.LegacyDriver(config)),
  HTTP: (config) => import('@proteo/data-manager-driver-http').then((m) => new m.HttpDriver(config))
};
