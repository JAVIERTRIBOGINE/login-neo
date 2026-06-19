import type { WindowBSMBridge } from '@proteo/types';

declare global {
  interface Window {
    bsmbridge?: WindowBSMBridge;
  }
}
