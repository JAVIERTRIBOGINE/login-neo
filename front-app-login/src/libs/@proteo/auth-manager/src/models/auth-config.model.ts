export interface AuthManagerConfig {
  endpoints: {
    authenticate: string;
  };
  resumeAuthId?: string;  // presente cuando PingAM redirige de vuelta con ?authId= tras fallo EntraID
  procedence?: string;
  language?: string;
}
