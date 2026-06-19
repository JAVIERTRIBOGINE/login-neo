import type { UserInfoResponse } from '@proteo/types';
import { StateManager } from '@proteo/state-manager';
import { setUserInfo, clearUserInfo } from './state/auth-user.action.js';
import { authUserReducer } from './state/auth-user.reducer.js';

StateManager.getInstance().registerReducer({ authUser: authUserReducer });

export class AuthUserInfo {
  static set(info: UserInfoResponse): void {
    StateManager.getInstance().dispatch(setUserInfo(info));
  }

  static get(): UserInfoResponse | null {
    return StateManager.getInstance().getState().authUser as UserInfoResponse | null;
  }

  static clear(): void {
    StateManager.getInstance().dispatch(clearUserInfo());
  }

  static subscribe(listener: (userInfo: UserInfoResponse | null) => void): () => void {
    return StateManager.getInstance().subscribe((state) => {
      listener(state.authUser as UserInfoResponse | null);
    });
  }
}
