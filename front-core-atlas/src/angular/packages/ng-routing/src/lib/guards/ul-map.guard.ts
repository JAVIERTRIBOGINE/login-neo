import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { DynamicRoutingService } from '../services/dynamic-routing.service';
import { LoggerUtils } from '@proteo/logger-utils';

const LOG_PREFIX = '[Dynamic Routing][Universal Links]';

/**
 * Guard function to handle dynamic routing based on Universal Link URL parameters.
 *
 * Reads `key` and `op` query params from the current URL:
 * - `op`: the fallback operative URL used when no mapping is found.
 * - `key`: the lookup key in `DynamicRoutingService.ulMapping`.
 *
 * If a mapping is found for `key`, redirects to the mapped URL preserving
 * remaining query params. Otherwise falls back to the `op` URL.
 * Always blocks the current navigation by returning `false`.
 *
 * @param _ - Unused route snapshot.
 * @param state - The current router state containing the URL being navigated to.
 * @returns `false` — navigation is always cancelled in favour of an explicit redirect.
 */
export const ulMapGuard: CanActivateFn = (_, state): boolean => {
  const router = inject(Router);
  const dynamicRouting = inject(DynamicRoutingService);

  const urlParams = new URLSearchParams(state.url.split('?')[1]);
  const keyParam = urlParams.get('key');
  const opParam = urlParams.get('op');

  if (!opParam) {
    LoggerUtils.getInstance().error(`${LOG_PREFIX} opParam is missing from URL`, {
      remoteLogger: true,
      type: 'application'
    });
    return false;
  }

  const redirectToOp = (): false => {
    urlParams.delete('op');
    const query = urlParams.toString();
    router.navigateByUrl(opParam + (query ? `?${query}` : ''));
    return false;
  };

  if (!dynamicRouting.ulMapping) {
    LoggerUtils.getInstance().error(`${LOG_PREFIX} ulMapping is not defined in config`, {
      remoteLogger: true,
      type: 'application'
    });
    return redirectToOp();
  }

  if (!keyParam || !dynamicRouting.ulMapping[keyParam]) {
    LoggerUtils.getInstance().error(`${LOG_PREFIX} key "${keyParam}" not found in ulMapping`, {
      remoteLogger: true,
      type: 'application'
    });
    return redirectToOp();
  }

  urlParams.delete('key');
  urlParams.delete('op');

  const query = urlParams.toString();
  const finalUrl = dynamicRouting.ulMapping[keyParam] + (query ? `?${query}` : '');

  LoggerUtils.getInstance().info(`${LOG_PREFIX} Redirecting key="${keyParam}" to: ${finalUrl}`, {
    remoteLogger: true,
    type: 'application'
  });

  router.navigateByUrl(finalUrl);
  return false;
};
