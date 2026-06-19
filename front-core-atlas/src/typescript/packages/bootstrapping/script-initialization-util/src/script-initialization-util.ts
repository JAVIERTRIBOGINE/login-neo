import { LoggerUtils } from '@proteo/logger-utils';

/**
 * The function append the scriptElements in order
 * @param doc document request information
 * @param onLoadFunction scriptElement request information
 * @returns {Promise<[boolean, string]>} boolean response with the status and optional string with the error
 */
export function appendElementScript(
  scriptElement: HTMLScriptElement,
  onLoadFunction?: () => void
): Promise<[boolean, string]> {
  const doc = document;
  const scriptUrl = scriptElement.src;
  const scriptId = scriptElement.id;
  return new Promise((resolve, reject) => {
    if (scriptId && document.querySelector(`#${scriptId}`)) {
      LoggerUtils.getInstance().error(
        `[Script Initialization util] The ID of the element you want to add is already added`,
        {
          remoteLogger: true,
          type: 'application'
        }
      );
      reject([false, 'script-already-included']);
      return;
    }
    // onerror control
    scriptElement.onerror = () => {
      reject([false, 'script-error']);
    };
    // onload specification
    scriptElement.onload = () => {
      LoggerUtils.getInstance().debug(
        `[Script Initialization util] onload from append element script, scriptUrl: ${scriptUrl}`,
        {
          remoteLogger: true,
          type: 'application'
        }
      );
      resolve([true, 'script-added']);
      if (onLoadFunction) {
        onLoadFunction();
      }
    };
    // Head injection
    const head = doc.getElementsByTagName('head')[0];
    if (head) {
      head.appendChild(scriptElement);
    } else {
      // Head missing check
      LoggerUtils.getInstance().error(
        '[Script Initialization util] No script was added because of no script tag HEAD existing',
        {
          remoteLogger: true,
          type: 'application'
        }
      );
      reject([false, 'no-head-tag']);
    }
  });
}
