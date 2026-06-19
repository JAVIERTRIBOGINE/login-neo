import { createAction } from '@proteo/state-manager';
import type { UserInfoResponse } from '@proteo/types';

export const setUserInfo = createAction<UserInfoResponse>('[AuthUser] setUserInfo');
export const clearUserInfo = createAction('[AuthUser] clearUserInfo');
