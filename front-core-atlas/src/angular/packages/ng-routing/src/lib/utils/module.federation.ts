import { LoadRemoteModuleOptions, LoadRemoteModuleEsmOptions, loadRemoteModule } from '@angular-architects/module-federation';
import { ErrorManager, ErrorManagementPayload } from '@proteo/error-management-utils';
import { getProteoErrorByMsg } from '@proteo/error-message-utils';
import { BsMfeLogEntry } from './mfe-registry/module-federation.types';
import { ShareScopeInspector } from './mfe-registry/share-scope.inspector';
import { BsMfeRegistry } from './mfe-registry/mfe-log.store';

/**
 * Thin orchestrator: loads a remote MFE module, captures shared-scope diagnostics
 * and delegates storage + presentation to dedicated collaborators.
 *
 * Single responsibility: coordinate the MFE load flow.
 * All other concerns (scope inspection, storage, console output) live in ./mfe-logs/.
 */
export const ModuleFederationWrapper = {
  async loadRemoteModule<T = any>(options: LoadRemoteModuleOptions): Promise<T> {
    const { remoteEntry } = options as LoadRemoteModuleEsmOptions;

    await ShareScopeInspector.init();
    const scopeBefore = ShareScopeInspector.snapshot();

    return loadRemoteModule<T>(options)
      .then((module) => {
        BsMfeRegistry.push(buildEntry({
          remoteEntry: remoteEntry ?? '',
          exposedModule: options.exposedModule ?? '',
          status: 'loaded',
          sharedModules: ShareScopeInspector.diff(scopeBefore, ShareScopeInspector.snapshot()),
        }));
        return module;
      })
      .catch((error) => {
        const formattedEntry = remoteEntry ? '@' + remoteEntry : '';
        const errorData: ErrorManagementPayload = {
          errorMessageTitle: 'Error loading microfrontend',
          errorMessageDetail: error.message,
          proteoError: getProteoErrorByMsg(error.message),
          severity: 'ERROR',
          errorSource: `${options.exposedModule}@${formattedEntry}`,
          nombreOperativa: options.exposedModule,
        };
        BsMfeRegistry.push(buildEntry({
          remoteEntry: remoteEntry ?? '',
          exposedModule: options.exposedModule ?? '',
          status: 'error',
          sharedModules: ShareScopeInspector.diff(scopeBefore, ShareScopeInspector.snapshot()),
          errorDetail: error.message,
        }));
        ErrorManager.errors$.next(errorData);
        return Promise.reject(errorData);
      });
  },
};

function buildEntry(fields: Omit<BsMfeLogEntry, 'timestamp'>): BsMfeLogEntry {
  return { timestamp: new Date().toISOString(), ...fields };
}
