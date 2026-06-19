import { TealiumInfoDriver } from '@proteo/tag-manager-driver-tealium-info';
import { TealiumTxDriver } from '@proteo/tag-manager-driver-tealium-tx';
import { TealiumTxP4Driver } from '@proteo/tag-manager-driver-tealium-tx-p4';
import type { ITagManagerDriver, TM_AVAILABLE_DRIVERS } from '@proteo/types';

/**
 * Available driver instance classes for Proteo4
 */
export const TM_AVAILABLE_DRIVERS_CLASS: Record<TM_AVAILABLE_DRIVERS, ITagManagerDriver> = {
  TX: new TealiumTxDriver(),
  INFO: new TealiumInfoDriver(),
  TXP4: new TealiumTxP4Driver()
};
