import { BsMfeLogEntry, SharedModuleLog, SharedModuleNegotiation } from './module-federation.types';

const EMOJI: Record<SharedModuleNegotiation, string> = {
  'ok': '🆗 OK',
  'resolved': '✅ RESOLVED',
  'pending': '⏳ PENDING',
  'conflict': '💥 CONFLICT',
  'remote-only': '📦 REMOTE-ONLY',
};

const CSS = {
  title: 'font-weight:bold; font-size:13px; color:#7C3AED',
  success: 'font-weight:bold; color:#16A34A',
  error: 'font-weight:bold; color:#DC2626',
  muted: 'color:#6B7280; font-size:11px',
  reset: 'color:inherit; font-weight:normal',
};

/**
 * Responsible solely for rendering MFE log entries to the browser console.
 * Pure presenter — reads data, produces formatted output, no storage or side-effects.
 */
export const MfeConsoleReporter = {
  print(logs: readonly BsMfeLogEntry[]): void {
    if (logs.length === 0) {
      console.log('%c 🚀 MFE Load Report — no entries yet', CSS.muted);
      return;
    }

    console.group('%c 🚀 MFE Registry Report', CSS.title);
    for (const entry of logs) {
      MfeConsoleReporter._printEntry(entry);
    }
    console.groupEnd();
  },

  _printEntry(entry: BsMfeLogEntry): void {
    const icon = entry.status === 'loaded' ? '✅' : '❌';
    const css = entry.status === 'loaded' ? CSS.success : CSS.error;

    console.groupCollapsed(
      `${icon} %c${entry.exposedModule}%c  ${entry.remoteEntry}  %c${new Date(entry.timestamp).toLocaleString()}`,
      css, CSS.muted, CSS.muted,
    );

    if (entry.sharedModules.length === 0) {
      console.log(
        '%c  ℹ️  No shared module changes detected (all versions match shell exactly)',
        CSS.muted,
      );
    } else {
      console.table(MfeConsoleReporter._toTableRows(entry.sharedModules));

      const conflicts = entry.sharedModules.filter((m) => m.negotiation === 'conflict');
      for (const c of conflicts) {
        console.warn(
          `💥 CONFLICT %c${c.package}%c — loaded simultaneously: ${c.conflictingVersions?.join(' + ')}`,
          'font-weight:bold', CSS.reset,
        );
      }
    }

    if (entry.errorDetail) {
      console.error('❌ Error detail:', entry.errorDetail);
    }

    console.groupEnd();
  },

  _toTableRows(modules: SharedModuleLog[]): Record<string, string>[] {
    return modules.map((m) => ({
      '': EMOJI[m.negotiation],
      'Package': m.package,
      'Shell': m.shellVersion ?? '—',
      'Remote': m.remoteVersion ?? '—',
      'Resolved': m.resolvedVersion ?? '⏳',
      'From': m.resolvedFrom ?? '—',
      'Negotiation': m.negotiation,
    }));
  },
};
