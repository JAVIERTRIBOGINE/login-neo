import { LoggerUtils } from '@proteo/logger-utils';
import { getEnvironment } from '@proteo/environment-detection-utils';
import { appendElementScript } from '@proteo/script-initialization-util';
import { type BaseAppConfig, EnumEnvironments } from '@proteo/types';
import { isNative } from '@proteo/platform-utils';
import { DYNATRACE_JS, DYNATRACE_NATIVE_WRAPPER_JS } from './dynatrace.constants.js';

async function loadDynatraceScript(id: string, src: string): Promise<void> {
  const scriptElement = document.createElement('script');
  scriptElement.id = id;
  scriptElement.type = 'text/javascript';
  scriptElement.src = src;
  scriptElement.crossOrigin = 'anonymous';

  try {
    await appendElementScript(scriptElement);
    LoggerUtils.getInstance().debug(`[Dynatrace Initializer] Javascript file added: ${id}`, {
      remoteLogger: true,
      type: 'application'
    });
  } catch (error: unknown) {
    const [result, message] = error as [boolean, string];
    if (!result && message === 'script-already-included') {
      LoggerUtils.getInstance().info(`[Dynatrace Initializer] Javascript file already added: ${id}`, {
        remoteLogger: true,
        type: 'application'
      });
    } else {
      throw error;
    }
  }
}

export async function initializeDynatrace(config: BaseAppConfig): Promise<boolean> {
  const environment: EnumEnvironments = getEnvironment();

  if (!config.DYNATRACE_CONFIG?.ACTIVATED) {
    LoggerUtils.getInstance().error(
      '[Dynatrace Initializer] Can not initialize because your config is set to not initialize Dynatrace',
      {
        remoteLogger: true,
        type: 'application'
      }
    );
    return false;
  }

  try {
    await loadDynatraceScript('dynatraceJS', DYNATRACE_JS[environment]);
  } catch (error) {
    LoggerUtils.getInstance().error(`[Dynatrace Initializer] Error initializing main Dynatrace script: ${error}`, {
      remoteLogger: true,
      type: 'application'
    });
    return false;
  }

  if (isNative()) {
    try {
      await loadDynatraceScript('dynatraceNativeWrapperJS', DYNATRACE_NATIVE_WRAPPER_JS[environment]);
    } catch (error) {
      LoggerUtils.getInstance().error(
        `[Dynatrace Initializer] Error initializing Dynatrace native wrapper script: ${error}`,
        {
          remoteLogger: true,
          type: 'application'
        }
      );
    }
  }

  return true;
}
