import type { TagInfoOperation } from '@proteo/types';

declare global {
  interface Window {
    bsSend<T>(operation: TagInfoOperation, tealiumData: T): void;
  }
}
