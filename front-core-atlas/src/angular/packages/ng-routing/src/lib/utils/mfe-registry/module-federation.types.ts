export type SharedModuleNegotiation = 'ok' | 'resolved' | 'pending' | 'conflict' | 'remote-only';

export type SharedModuleLog = {
  /**
   * Package name (e.g. '@angular/core').
   *
   * NOTE: packages where shell and remote share the EXACT same version key
   * are invisible to snapshot diffing because webpack's container.init() is
   * a no-op when the version already exists in scope. Those packages (typically
   * @angular/* when both sides are on the same release) will NOT appear here.
   * To capture them a Proxy intercept on the scope object would be required.
   */
  package: string;
  /** Version the shell had registered in scope before this remote loaded. `null` → shell does not provide this package. */
  shellVersion: string | null;
  /** Version the remote registered in scope during its container.init(). `null` → remote did not add a new version; it consumed the shell's directly. */
  remoteVersion: string | null;
  /** The version webpack MF actually selected, determined by the loaded=true flag after the remote loads. `null` when negotiation is 'pending'. */
  resolvedVersion: string | null;
  /** Container/bundle that provides the resolved version (e.g. 'bsm-shell', 'globalPosition'). */
  resolvedFrom: string | null;
  /**
   * 'ok'          – shell and remote agree on the same version.
   * 'resolved'    – versions differed but MF negotiated correctly; only one version is loaded.
   * 'pending'     – versions differ but the module has not been consumed yet (lazy component).
   * 'conflict'    – multiple versions are simultaneously loaded → real singleton violation ⚠️
   * 'remote-only' – shell does not provide this package; remote supplies it exclusively.
   */
  negotiation: SharedModuleNegotiation;
  /** Only present when negotiation === 'conflict': every version loaded simultaneously. */
  conflictingVersions?: string[];
};

export type BsMfeLogEntry = {
  timestamp: string;
  remoteEntry: string;
  exposedModule: string;
  status: 'loaded' | 'error';
  sharedModules: SharedModuleLog[];
  errorDetail?: string;
};
