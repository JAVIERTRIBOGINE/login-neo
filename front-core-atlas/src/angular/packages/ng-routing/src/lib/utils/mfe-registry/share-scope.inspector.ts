import { SharedModuleLog } from './module-federation.types';

// Webpack 5 Module Federation runtime variables.
// NOT on `window` — webpack replaces these identifiers with the actual runtime
// references when it processes any module, including compiled library files.
declare const __webpack_share_scopes__: Record<string, Record<string, Record<string, any>>>;
declare function __webpack_init_sharing__(scopeName: string): Promise<void>;

type VersionEntry = { from: string; loaded: boolean };
type ScopeSnapshot = Record<string, Record<string, VersionEntry>>;

/**
 * Responsible solely for reading and comparing webpack's __webpack_share_scopes__.
 * Pure utility — no side effects, no storage.
 */
export const ShareScopeInspector = {
  /**
   * Ensures the shell's share scope is fully initialised before snapshotting.
   * __webpack_init_sharing__ is idempotent — safe to call multiple times.
   */
  async init(): Promise<void> {
    try {
      // eslint-disable-next-line no-undef
      await __webpack_init_sharing__('default');
    } catch { /* not available in test / SSR environments */ }
  },

  /**
   * Returns a deep copy of __webpack_share_scopes__.default.
   * Must be accessed directly (not via window) so webpack's SharePlugin
   * can replace the identifier with the actual runtime reference.
   */
  snapshot(): ScopeSnapshot {
    try {
      // eslint-disable-next-line no-undef
      const scope = __webpack_share_scopes__?.['default'];
      if (!scope) return {};
      const snap: ScopeSnapshot = {};
      for (const [pkg, versions] of Object.entries<any>(scope)) {
        snap[pkg] = {};
        for (const [ver, info] of Object.entries<any>(versions)) {
          snap[pkg][ver] = { from: info.from ?? '', loaded: !!info.loaded };
        }
      }
      return snap;
    } catch {
      return {};
    }
  },

  /**
   * Compares two snapshots and returns one entry per package whose state
   * changed during a remote load.
   *
   * How webpack populates the scope:
   *   1. __webpack_init_sharing__ → shell registers all its provided versions.
   *   2. container.init(scope)    → remote registers versions NOT yet in scope,
   *      or adds a new version key when its version differs from the shell's.
   *   3. container.get(module)    → factory runs → shared deps are consumed,
   *      setting loaded=1 on the winning version entry.
   *
   * Limitation: packages where shell and remote have the EXACT same version are
   * invisible — the remote's registration is a no-op and the scope doesn't change.
   */
  diff(before: ScopeSnapshot, after: ScopeSnapshot): SharedModuleLog[] {
    const result: SharedModuleLog[] = [];
    const allPackages = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const pkg of allPackages) {
      const beforeVersions = before[pkg] ?? {};
      const afterVersions  = after[pkg]  ?? {};
      const shellVersions  = Object.keys(beforeVersions);
      const addedVersions  = Object.keys(afterVersions).filter((v) => !beforeVersions[v]);

      if (addedVersions.length === 0) {
        // Remote didn't add a new version key → it used the shell's directly.
        // Only report packages that were newly consumed (loaded) during this remote's load.
        for (const ver of shellVersions) {
          if (!beforeVersions[ver].loaded && afterVersions[ver]?.loaded) {
            result.push({
              package: pkg,
              shellVersion: ver,
              remoteVersion: null,
              resolvedVersion: ver,
              resolvedFrom: afterVersions[ver].from,
              negotiation: 'ok',
            });
          }
        }
      } else {
        for (const remoteVer of addedVersions) {
          result.push(
            ShareScopeInspector._buildLog(pkg, shellVersions[0] ?? null, remoteVer, afterVersions),
          );
        }
      }
    }

    return result;
  },

  _buildLog(
    pkg: string,
    shellVer: string | null,
    remoteVer: string,
    afterVersions: Record<string, VersionEntry>,
  ): SharedModuleLog {
    const loadedEntries = Object.entries(afterVersions).filter(([, info]) => info.loaded);

    if (shellVer === null) {
      return {
        package: pkg,
        shellVersion: null,
        remoteVersion: remoteVer,
        resolvedVersion: loadedEntries[0]?.[0] ?? remoteVer,
        resolvedFrom: loadedEntries[0]?.[1]?.from ?? afterVersions[remoteVer].from,
        negotiation: 'remote-only',
      };
    }

    if (loadedEntries.length === 0) {
      return {
        package: pkg, shellVersion: shellVer, remoteVersion: remoteVer,
        resolvedVersion: null, resolvedFrom: null, negotiation: 'pending',
      };
    }

    if (loadedEntries.length > 1) {
      return {
        package: pkg, shellVersion: shellVer, remoteVersion: remoteVer,
        resolvedVersion: null,
        resolvedFrom: loadedEntries.map(([, i]) => i.from).join(', '),
        negotiation: 'conflict',
        conflictingVersions: loadedEntries.map(([v]) => v),
      };
    }

    return {
      package: pkg, shellVersion: shellVer, remoteVersion: remoteVer,
      resolvedVersion: loadedEntries[0][0],
      resolvedFrom: loadedEntries[0][1].from,
      negotiation: 'resolved',
    };
  },
};
