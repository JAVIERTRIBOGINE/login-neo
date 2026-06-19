import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { EventManager } from '@proteo/event-bus';
import { DynamicRoutingService } from '../services/dynamic-routing.service';
import { AUTH_DEFAULT_PATHS } from '../constants';
import { hasTokens } from '@proteo/data-manager';
import { isNative } from '@proteo/platform-utils';
import { LoggerUtils } from '@proteo/logger-utils';
import { CheckAuthResponse } from '../models/dynamic-routing.model';

/**
 * Auth guard function to determine if a user is authenticated before allowing access to a route.
 * 
 * @returns A promise that resolves to a boolean indicating whether the user is authenticated.
 * 
 * This guard performs the following checks:
 * - Verifies if the user has valid tokens using the `hasTokens` function.
 * - If the user is on a native platform and not authenticated, it attempts to check authentication
 *   by publishing a `CHECK_AUTH` event and awaiting the response.
 * - If the user is not authenticated, redirects them to the login path specified in the configuration
 *   or a default login path.
 */

export const authGuard: CanActivateFn = async (_, state): Promise<boolean> => {
    const router = inject(Router);
    const dynamicRounting = inject(DynamicRoutingService);

    const payload = {
        method: 'checkAuth'
    };

    let isAuthenticated : boolean = hasTokens();
    const native = isNative();

    if(!isAuthenticated && native){
        try {
            const eventResponse: CheckAuthResponse = await EventManager.getInstance().publishWithResponse('CHECK_AUTH', payload);
            isAuthenticated = eventResponse.status === true;
        } catch (error) {
            LoggerUtils.getInstance().error(`❌ [Dynamic Routing] Error in CHECK_AUTH: ${error}`);
            isAuthenticated = false;
        }
    }

    if (!isAuthenticated) {
        const redirectUri = state.url;
        LoggerUtils.getInstance().info(`🚀 [Dynamic Routing] authGuard redirectUri: ${redirectUri}`);
        router.navigate([dynamicRounting.authConfig?.LOGIN_PATH || AUTH_DEFAULT_PATHS.LOGIN_PATH], {queryParams: { redirectUri },});
    }

    return isAuthenticated;
};