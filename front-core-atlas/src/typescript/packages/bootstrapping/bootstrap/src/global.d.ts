import type { BridgeUnionType } from './bridge-bootstrap.js';

declare global {
  interface Window {
    BsTranslateErrorDriver: string;
    BsBridge: BridgeUnionType;
  }
}
