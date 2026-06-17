import { AuthorizationUrls } from "@proteo/types";

export interface InfoModel {
    name: string;
}



export const DEFAULT_AUTH_TYPE = 'LIGHT_USERS' as AuthenticationType;


 export type AuthenticationType = 'TEMPORAL_IDENTITIES' | 'EMPLOYEES' | 'CUSTOMER' | 'LIGHT_USERS';

declare global {
  interface Window {
    BsAuthorizationConfig: {
      type: AuthenticationType;
      url: AuthorizationUrls;
      dataManager: string;
      clientID: string;
      scopes?: string[];
      redirectUri: string;
    };
  }
}