import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

/**
 * A guard function that validates the presence of required parameters in the URL
 * before allowing navigation. If any required parameter is missing, the user is
 * redirected to a specified path with the original URL as a query parameter.
 *
 * @param route - The current `ActivatedRouteSnapshot` containing route information.
 * @param state - The current `RouterStateSnapshot` containing the target URL.
 * @returns A `Promise<boolean>` that resolves to `true` if all required parameters
 *          are present, or `false` if the user is redirected.
 *
 * @remarks
 * - The required parameters and their type (query parameters or URL segments) are
 *   specified in the route's `data` property.
 * - If `parameterType` is `'queryParam'`, the guard checks for the presence of
 *   the specified query parameters.
 * - If `parameterType` is `'segment'`, the guard checks for the presence of the
 *   specified URL segments at the given positions.
 * - If any required parameters are missing, the user is redirected to `redirectPath`
 *   with the original URL passed as a query parameter named `originalUrl`.
 * - If `parameters`, `redirectPath`, or `parameterType` are not defined in the route's
 *   `data` property, navigation is allowed by default.
 *
 * @example
 * Route configuration:
 * ```typescript
 * {
 *   path: 'example',
 *   component: ExampleComponent,
 *   canActivate: [paramsGuard],
 *   data: {
 *     parameters: ['param1', 'param2'],
 *     parameterType: 'queryParam',
 *     redirectPath: '/error'
 *   }
 * }
 * ```
 * If `param1` or `param2` are missing in the query parameters, the user is redirected
 * to `/error?originalUrl=example`.
 */

export const paramsGuard: CanActivateFn = async (route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> => {
  const router = inject(Router);
  const targetUrl = state.url;
  const parameters: string[] = route.data?.['parameters'];
  const parameterType: 'queryParam' | 'segment' = route.data?.['parameterType'];
  const segmentPositions: number[] = route.data?.['segment'];
  const redirectPath = route.data?.['redirectPath'];

  if (!parameters || !redirectPath || !parameterType) {
    return true;
  }

  const urlParams = route.url.map((segment) => segment.path);
  const queryParams = new URLSearchParams(targetUrl.split('?')[1]);

  let missingParams: string[] = [];

  if (parameterType === 'queryParam') {
    missingParams = parameters.filter((param) => !queryParams.has(param));
  } else if (parameterType === 'segment' && segmentPositions) {
    missingParams = parameters.filter((param, index) => {
      const position = segmentPositions[index];
      const segmentValue = urlParams[position];
      return (
        position === undefined ||
        segmentValue === undefined ||
        segmentValue === null ||
        segmentValue === `:${param}` ||
        segmentValue === 'null' ||
        segmentValue === 'undefined'
      );
    });
  }

  const hasAllParams = missingParams.length === 0;

  if (!hasAllParams) {
    const cleanedUrl = targetUrl.replace('/', '');
    router.navigate([redirectPath], { queryParams: { originalUrl: cleanedUrl } });
    return false;
  }

  return true;
};

/**
 * @deprecated Use `paramsGuard` instead.
 */
export const universalLinkGuard: CanActivateFn = paramsGuard;
