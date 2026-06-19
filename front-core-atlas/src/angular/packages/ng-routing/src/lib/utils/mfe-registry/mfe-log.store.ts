import { BsMfeLogEntry } from './module-federation.types';
import { MfeConsoleReporter } from './mfe-console-reporter';

// Module-level private store — not on window, fully type-safe.
const _logs: BsMfeLogEntry[] = [];

/**
 * Single source of truth for MFE load history.
 *
 * Write access is intentionally narrow (push) to prevent external mutation.
 * Read access is exposed via typed, purpose-built methods.
 *
 * Automatically available on the browser console via window.BsMfeRegistry:
 *   window.BsMfeRegistry.getAll()
 *   window.BsMfeRegistry.printTable()
 *   window.BsMfeRegistry.getConflicts()
 *   window.BsMfeRegistry.getErrors()
 *
 * @internal — not part of the public package API.
 */
const BsMfeRegistry = {
  /** @internal — used only by ModuleFederationWrapper */
  push(entry: BsMfeLogEntry): void {
    _logs.push(entry);
  },

  /** All recorded MFE load entries, in chronological order. */
  getAll(): readonly BsMfeLogEntry[] {
    return _logs;
  },

  /** Only entries where at least one shared module has a real singleton conflict. */
  getConflicts(): BsMfeLogEntry[] {
    return _logs.filter((e) => e.sharedModules.some((m) => m.negotiation === 'conflict'));
  },

  /** Only entries where the load failed. */
  getErrors(): BsMfeLogEntry[] {
    return _logs.filter((e) => e.status === 'error');
  },

  /** Renders a formatted, coloured table of all entries to the browser console. */
  printTable(): void {
    MfeConsoleReporter.print(_logs);
  },

  /** Clears the in-memory log history. */
  clear(): void {
    _logs.length = 0;
  }
} as const;

// Automatically expose on window so it is always reachable from browser devtools.
(window as any).BsMfeRegistry = BsMfeRegistry;

export { BsMfeRegistry };
