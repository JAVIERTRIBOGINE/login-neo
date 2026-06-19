import type { SignatureUtils } from './signature-utils.js';

declare global {
  interface Window {
    BsSignatureUtils: SignatureUtils;
  }
}
