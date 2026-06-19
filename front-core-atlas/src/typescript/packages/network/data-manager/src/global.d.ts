import type { DataManagerDriver } from '@proteo/data-manager-driver';
import type { Proteo4Driver } from '@proteo/data-manager-driver-proteo4';
import type { DriverConfiguration } from '@proteo/types';

declare global {
  interface Window {
    BsDataManager: {
      driversMap: Map<string, DataManagerDriver | Proteo4Driver>;
      pendingConfigsMap: Map<string, DriverConfiguration[]>;
    };
  }
}
