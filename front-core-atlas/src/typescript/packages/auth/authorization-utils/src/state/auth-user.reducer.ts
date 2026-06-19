import { createReducer } from '@proteo/state-manager';
import type { UserInfoResponse } from '@proteo/types';
import { setUserInfo, clearUserInfo } from './auth-user.action.js';

export type AuthUserState = UserInfoResponse | null;

const SET_USER_INFO = setUserInfo().type;
const CLEAR_USER_INFO = clearUserInfo().type;

export const authUserReducer = createReducer<AuthUserState>(null, {
  [SET_USER_INFO]: (state, action) => (action.payload as UserInfoResponse) ?? state,
  [CLEAR_USER_INFO]: () => null
});
