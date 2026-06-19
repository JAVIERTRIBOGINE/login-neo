import type { BridgeAndroid } from '@proteo/bridge-bsm-android';
import type { BridgeIos } from '@proteo/bridge-bsm-ios';
import type { BridgeWeb } from '@proteo/bridge-web';
import type { BridgeWebEE } from '@proteo/bridge-web-ee';
import { EventBus } from '@proteo/event-bus';
import { isIOS, isJxBrowser, isNative, isWebContainer } from '@proteo/platform-utils';
import type { CoreShellConfig } from '@proteo/types';

type BridgeUnionType = BridgeIos | BridgeAndroid | BridgeWebEE | BridgeWeb;

export type { BridgeUnionType };

/**
 * Class for Proteo4 Bridge initialization.
 */
export class BridgeBootstrap {
  /**
   * Initialize the bridge and the event bus and the proteo
   * bridge depending on the platform
   * @param bridgeEvents bridge events
   */
  public static async initialize(config: CoreShellConfig): Promise<BridgeUnionType> {
    new EventBus();
    let BridgeToInit;

    if (window.BsBridge) {
      return window.BsBridge;
    }

    if (isWebContainer()) {
      ({ BridgeWeb: BridgeToInit } = await import('@proteo/bridge-web'));

      window.BsBridge = new BridgeToInit(config.BRIDGE_EVENTS, config.BRIDGE_BROADCAST_EVENTS);
      return window.BsBridge;
    }

    if (isNative()) {
      if (isIOS()) {
        ({ BridgeIos: BridgeToInit } = await import('@proteo/bridge-bsm-ios'));
      } else {
        ({ BridgeAndroid: BridgeToInit } = await import('@proteo/bridge-bsm-android'));
      }
    } else {
      if (isJxBrowser()) {
        ({ BridgeWebEE: BridgeToInit } = await import('@proteo/bridge-web-ee'));
      } else {
        ({ BridgeWeb: BridgeToInit } = await import('@proteo/bridge-web'));
      }
    }

    window.BsBridge = new BridgeToInit(config.BRIDGE_EVENTS, config.BRIDGE_BROADCAST_EVENTS);
    return window.BsBridge;
  }
}
