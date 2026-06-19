import { KeepAlive } from '@proteo/keep-alive';
import {
  DEFAULT_REDIRECT_URI,
  authorize,
  getTokens,
  initialize as authInitialize,
  isAuthInitialized,
  DEFAULT_CLIENT_ID,
  extractUserInfoFromToken
} from '@proteo/authorization-utils';
import { BridgeBootstrap, CoreBootstrap } from '@proteo/bootstrap';
import { ConfigLoader } from '@proteo/config-loader';
import { setAuthorization, clearTokens as clearDataManagerTokens } from '@proteo/data-manager';
import { watchErrors } from '@proteo/error-handler-utils';
import { EventManager } from '@proteo/event-bus';
import { I18n } from '@proteo/i18n-utils';
import { EVENT_PROTEO_LOGGER_LOG, LoggerUtils } from '@proteo/logger-utils';
import { isFullProteo } from '@proteo/platform-utils';
import { clearTokens } from '@proteo/refresh-tokens-utils';
import { ResizeUtils } from '@proteo/resize-utils';
import { StateManager } from '@proteo/state-manager';
import { TagManager } from '@proteo/tag-manager';
import type {
  AuthConfig,
  AuthorizationTokens,
  AuthorizeResponse,
  BaseAppConfig,
  BootstrapDrivers,
  CoreBrowserConfig,
  CoreShellConfig,
  DataManagerResponse,
  IEventManager,
  InitEventPayload,
  InitEventResponsePayload,
  LoaderConf,
  LoggerCustomEvent,
  TokensResponse,
  WindowAuthConfig
} from '@proteo/types';
import { log } from '@proteo/remote-logger-utils';

/**
 * Class for Proteo4 Shell Portal initialization in a browser environment. It
 * will load the portal configuration, the bridge and the event bus for a proteo4
 * ecosystem or a legacy ecosystem
 */
export class BrowserPlatform<T extends CoreBrowserConfig> {
  // Properties
  private storedTokens!: AuthorizationTokens;
  private tokensExpiration = 0;
  private lastRefreshTimestamp = 0;

  constructor(
    private eventManager: IEventManager = EventManager.getInstance(),
    private readonly resizeUtils: ResizeUtils = ResizeUtils.getInstance(),
    private readonly logger: LoggerUtils = LoggerUtils.getInstance()
  ) {
    window.globalStore = new StateManager();
  }

  /**
   * Core bootstrapping method
   * @param loaderConfiguration - Application config.
   * @param drivers - @deprecated This parameter is obsolete and will be removed in future versions.
   */
  async bootstrap(loaderConfiguration?: LoaderConf, _drivers?: BootstrapDrivers): Promise<T> {
    // Load env configuration
    const config = await ConfigLoader.retrieveAllGlobalConfig<T>(loaderConfiguration as LoaderConf);
    let initData: InitEventResponsePayload = { language: '' };
    this.setLogsListeners(config);

    await Promise.all([CoreBootstrap.initialize(config), BridgeBootstrap.initialize(config)]);
    // Recovering eventManager instance after initialization from core bootstrap
    this.eventManager = EventManager.getInstance();
    this.eventManager.subscribe('REQUEST_INVALIDATE_TOKENS', this.clearTokens);

    if (isFullProteo()) {
      this.logger.debug('[BrowserPlatform] bootstrap: full proteo scenario');
      this.requestRefreshTokensHandler(config);
    } else {
      // Legacy scenarios (BSO/BSM/EE)
      this.logger.debug('[BrowserPlatform] bootstrap: non proteo scenario');
      const { VERSION: version, NAME: moduleDescription } = config.APP_CONFIG;
      this.eventManager.subscribe(
        'REFRESH_TOKENS',
        async <RefreshTokensEventResponsePayload>(_message: string, data: RefreshTokensEventResponsePayload) => {
          setAuthorization(data as AuthorizationTokens);
        }
      );
      const initBridgeData: InitEventPayload = {
        platform: 'P4',
        version,
        moduleDescription
      };

      this.populateClientData(initBridgeData, config);

      initData = await this.eventManager.publishWithResponse<InitEventResponsePayload>('INIT', {
        method: 'initBridge',
        data: initBridgeData
      });

      // Hack for BSM scenario (external data comes into init parameters)
      if (initData.initParameters) {
        initData.externalData = initData.initParameters;
        delete initData.initParameters;
      }

      // Store init tokens into data manager shell instance
      if (initData.auth) setAuthorization(initData.auth);

      // Configure language from init parameters
      if (initData.language) I18n.getInstance().use(initData.language, true);

      // Push analytics data into TagManager dataLayer
      if (initData.analytics) TagManager.storeBSMAnalyticsData({ globalInfo: initData.analytics });

      // Fetch numPersona from encoded user info
      if (initData.userInfo) {
        try {
          const userInfo = extractUserInfoFromToken(initData.userInfo);
          TagManager.getInstance().setNumPersona(userInfo.numpersona);
        } catch (error) {
          LoggerUtils.getInstance().error(`[BrowserPlatform] bootstrap: User info parse error: ${error}`, {
            remoteLogger: true,
            type: 'application'
          });
        }
      }

      // The utility observe the change on document.body element to emit an event that will be handled on HOST listeners
      this.resizeUtils.initObserve(document.body);
    }

    this.setKeepAliveInteractions();

    return { ...config, INIT_DATA: initData };
  }

  private populateClientData(target: InitEventPayload, config: BaseAppConfig) {
    window.BsAuthorizationConfig ??= {} as WindowAuthConfig;
    if (config?.AUTH_CONFIG?.CLIENT_ID && config.AUTH_CONFIG.CLIENT_ID !== DEFAULT_CLIENT_ID) {
      target.clientId = config.AUTH_CONFIG.CLIENT_ID;
      window.BsAuthorizationConfig.clientID = config.AUTH_CONFIG.CLIENT_ID;
    }
    if (config?.AUTH_CONFIG?.REDIRECT_URI && config.AUTH_CONFIG.REDIRECT_URI !== DEFAULT_REDIRECT_URI) {
      target.redirectUri = config.AUTH_CONFIG.REDIRECT_URI;
      window.BsAuthorizationConfig.redirectUri = config.AUTH_CONFIG.REDIRECT_URI;
    }
  }

  private setLogsListeners(config: BaseAppConfig) {
    watchErrors();
    // -- Listener for ACCESS_LOGS -------------------------------
    if (config.LOGGING_CONFIG?.API_ENABLED) {
      window.addEventListener(EVENT_PROTEO_LOGGER_LOG, (event) => {
        log(config, (event as CustomEvent<LoggerCustomEvent>).detail);
      });
    }
  }

  private setKeepAliveInteractions() {
    // Listener to emit all KeepAlive events when user interacts with app
    const EVENT_KEY_INDEX = 2;
    Object.keys(window).forEach((key) => {
      if (/^on(click|key|tap|drag)/.test(key)) {
        window.addEventListener(key.slice(EVENT_KEY_INDEX), () => {
          KeepAlive.getInstance().keepAlive();
        });
      }
    });
  }

  /**
   * Activates the listener for beginning with the refresh tokens
   * @param config environment configuration
   */
  requestRefreshTokensHandler(config: CoreShellConfig): void {
    this.eventManager.subscribeForResponse('REQUEST_REFRESH_TOKENS', async (_message: string) => {
      return await this.refreshTokensFunction(config);
    });
  }
  /**
   * Verifies if the Auth config is properly set
   * @param config environment configuration
   */
  verifyAuthConfig(config: CoreShellConfig): { valid: boolean; error: string } {
    let valid = false;
    let error = '';
    if (config && config.AUTH_CONFIG) {
      if (config.AUTH_CONFIG.REDIRECT_URI === DEFAULT_REDIRECT_URI) {
        error = 'Redirect URI not set';
      } else if (config.AUTH_CONFIG.CLIENT_ID === DEFAULT_CLIENT_ID) {
        error = 'Client ID not set';
      } else {
        valid = true;
      }
    } else {
      error = 'Auth config is missing';
    }
    return { valid, error };
  }

  composeError(message: string): unknown {
    return { error: message };
  }
  /**
   * Handles request refresh tokens for proteo4 scenarios where the data
   * manager emits this event when a 401 with token expired is emitted
   * @param config environment configuration
   */
  async refreshTokensFunction(config: CoreShellConfig): Promise<unknown> {
    if (!isAuthInitialized()) {
      const verification = this.verifyAuthConfig(config);
      if (verification.valid) {
        authInitialize(config.AUTH_CONFIG as AuthConfig);
      } else {
        return this.composeError(verification.error);
      }
    } else {
      const MILLIS_PER_SECOND = 1000;
      const now = new Date().getTime();
      if (this.tokensExpiration * MILLIS_PER_SECOND < now - this.lastRefreshTimestamp) {
        return await this.refreshTokensProcess();
      }
    }
    return this.storedTokens;
  }

  async refreshTokensProcess(): Promise<unknown> {
    try {
      const {
        clientID: clientId,
        redirectUri: redirectUri,
        scopes: scopes,
        type: authType
      } = window.BsAuthorizationConfig;
      const authorizeResponse = await authorize({
        clientId,
        redirectUri,
        scope: scopes?.join(' '),
        method: authType === 'EMPLOYEES' ? 'post' : 'get'
      });

      // Obtain redirect params and validate state
      const redirectParams =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        authType === 'EMPLOYEES'
          ? new URL(`${(authorizeResponse.data as AuthorizeResponse).location}`).searchParams
          : new URL(authorizeResponse.url).searchParams;

      // Get Tokens request
      const tokensResponse: DataManagerResponse<TokensResponse> = await getTokens({
        clientId,
        redirectUri,
        code: redirectParams.get('code') || '',
        state: redirectParams.get('state') || ''
      });

      if (tokensResponse.data) {
        const tokenResponseData = tokensResponse.data as TokensResponse;
        this.tokensExpiration = +tokenResponseData.expires_in;
        this.lastRefreshTimestamp = new Date().getTime();
        this.storedTokens = { OAUTH: tokenResponseData.access_token, OIDC: tokenResponseData.id_token };
        return this.storedTokens;
      }
      return this.composeError('AUTH_ERROR');
    } catch (error) {
      this.eventManager.publish('AUTH_ERROR', error);
      return this.composeError('AUTH_ERROR');
    }
  }

  /**
   * Clear authorization tokens when REQUEST_INVALIDATE_TOKENS event is recived
   */
  clearTokens(): void {
    this.storedTokens = { OAUTH: '', OIDC: '' };
    this.tokensExpiration = 0;
    this.lastRefreshTimestamp = 0;
    clearDataManagerTokens();
    clearTokens();
  }
}
