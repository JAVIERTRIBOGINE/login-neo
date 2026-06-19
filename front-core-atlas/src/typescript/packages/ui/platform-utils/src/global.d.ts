import type { Webkit, WindowBSMBridge } from '@proteo/types';

declare global {
  interface Window {
    bsmbridge: WindowBSMBridge;
    webkit: Webkit;
  }
}
