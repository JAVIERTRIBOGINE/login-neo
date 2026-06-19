import type { EclipseDesktop } from '@proteo/types';

declare global {
  interface Window {
    eclipseDesktop: EclipseDesktop;
    getLanguage?: (data: unknown) => void;
    proteoSync: import('./proteo-sync.js').ProteoSync;
  }
}
