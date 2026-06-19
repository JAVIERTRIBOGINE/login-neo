import type { Webkit } from '@proteo/types';

declare global {
  interface Window {
    webkit?: Webkit;
  }
}
