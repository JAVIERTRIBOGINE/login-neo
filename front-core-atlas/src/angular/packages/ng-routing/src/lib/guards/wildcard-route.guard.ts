import { CanActivateFn } from '@angular/router';
import { CTA_ACTION_MAP } from '../constants';
import { EventManager } from '@proteo/event-bus';


/**
 * A guard function that determines whether a route can be activated based on the provided state.
 *
 * @param _ - The first parameter is unused in this implementation.
 * @param state - The router state snapshot containing the URL of the route being activated.
 * @returns A boolean indicating whether the route can be activated.
 *
 * The function extracts the current path from the state URL, splits it into parts, and determines
 * an action and a target based on the path. If the action or target contains "deep-link", the action
 * is normalized to "deepLink". The function then delegates the decision to `handleWildcardRouteAction`.
 */
export const wildcardRouteGuard: CanActivateFn = (_, state): boolean => {
    const currentPath = state.url.startsWith('/') ? state.url.substring(1) : state.url;
    const pathParts = currentPath.split('/');
    let action = pathParts[0];
    const target = pathParts.length > 1 ? pathParts.slice(1).join('/') : action;
    if (action.includes('deep-link') || target.includes('deep-link')) {
      action = 'deepLink';
    }
    return handleWildcardRouteAction(action, target);
};

/**
 * Handles a wildcard route action by determining the appropriate method and data
 * to use based on the provided action and target. It publishes an event with the
 * constructed payload using the EventManager.
 *
 * @param action - The action to be performed. This is used to determine the method
 *                 and event to be triggered. If the action is not found in the
 *                 `CTA_ACTION_MAP`, a default action is used.
 * @param target - The target associated with the action. This is used to construct
 *                 the payload data.
 * @returns Always returns `false`.
 */
function handleWildcardRouteAction(action: string, target: string): boolean {
    const payload = {
      method: '',
      data: {}
    };

    const standarData = {
      operativeName: 'appId',
      externalData: JSON.stringify({ target })
    };

    const ctaData = {
      url: target
    };

    const selectedAction = CTA_ACTION_MAP[action] || CTA_ACTION_MAP['default'];
    payload.method = selectedAction.method;
    payload.data = selectedAction.method === 'openOperative' ? standarData : ctaData;

    EventManager.getInstance().publish(selectedAction.event, payload);

    return false;
}