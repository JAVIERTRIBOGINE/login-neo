import { jest } from '@jest/globals';

jest.unstable_mockModule('@proteo/data-manager', () => ({ hasTokens: jest.fn() }));
jest.unstable_mockModule('@proteo/platform-utils', () => ({ isNative: jest.fn(), isFullProteo: jest.fn() }));
jest.unstable_mockModule('@proteo/event-bus', () => ({
  EventManager: { getInstance: jest.fn(), publishWithResponse: jest.fn() }
}));

const { authGuard } = await import('../guards/auth.guard');
const { Router, ActivatedRouteSnapshot, ParamMap, RouterStateSnapshot } = await import('@angular/router');
const { DynamicRoutingService } = await import('../services/dynamic-routing.service');
const { AUTH_DEFAULT_PATHS } = await import('../constants');
const { hasTokens } = await import('@proteo/data-manager');
const { isNative } = await import('@proteo/platform-utils');
const { EventManager } = await import('@proteo/event-bus');
const { LoggerUtils } = await import('@proteo/logger-utils');
const { runInInjectionContext, Injector } = await import('@angular/core');

describe('authGuard', () => {
  let routerMock: Partial<Router>;
  let dynamicRoutingMock: Partial<DynamicRoutingService>;
  const mockRoute: ActivatedRouteSnapshot = {
    url: [],
    params: {},
    queryParams: {},
    fragment: null,
    data: {},
    outlet: '',
    component: null,
    routeConfig: null,
    root: {} as ActivatedRouteSnapshot,
    parent: null,
    firstChild: null,
    children: [],
    pathFromRoot: [],
    paramMap: {} as ParamMap,
    queryParamMap: {} as ParamMap,
    toString: () => '',
    title: undefined
  };

  const createInjector = (router: Partial<Router>, dynamicRouting: Partial<DynamicRoutingService>) =>
    Injector.create({
      providers: [
        { provide: Router, useValue: router },
        { provide: DynamicRoutingService, useValue: dynamicRouting }
      ]
    });

  beforeEach(() => {
    routerMock = {
      url: '/current-path',
      navigate: jest.fn().mockResolvedValue(true)
    };
    dynamicRoutingMock = {
      authConfig: { LOGIN_PATH: '/custom-login' }
    };

    jest.clearAllMocks();
  });

  it('should return true if hasTokens returns true', async () => {
    (hasTokens as jest.Mock).mockReturnValue(true);
    (isNative as jest.Mock).mockReturnValue(false);

    const mockState: RouterStateSnapshot = { url: routerMock.url } as RouterStateSnapshot;
    const result = await runInInjectionContext(createInjector(routerMock, dynamicRoutingMock), () =>
      authGuard(mockRoute, mockState)
    );
    expect(result).toBe(true);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('should redirect to login if not authenticated and not native', async () => {
    (hasTokens as jest.Mock).mockReturnValue(false);

    const mockState: RouterStateSnapshot = { url: routerMock.url } as RouterStateSnapshot;
    const result = await runInInjectionContext(createInjector(routerMock, dynamicRoutingMock), () =>
      authGuard(mockRoute, mockState)
    );

    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/custom-login'], {
      queryParams: { redirectUri: '/current-path' }
    });
  });

  it('should check auth via event and return true if event returns status true', async () => {
    (hasTokens as jest.Mock).mockReturnValue(false);
    (isNative as jest.Mock).mockReturnValue(true);

    const publishWithResponseMock = jest.fn().mockResolvedValue({ status: true });
    (EventManager.getInstance as jest.Mock).mockReturnValue({
      publishWithResponse: publishWithResponseMock
    });
    const mockState: RouterStateSnapshot = { url: routerMock.url } as RouterStateSnapshot;
    const result = await runInInjectionContext(createInjector(routerMock, dynamicRoutingMock), () =>
      authGuard(mockRoute, mockState)
    );

    expect(publishWithResponseMock).toHaveBeenCalledWith('CHECK_AUTH', { method: 'checkAuth' });
    expect(result).toBe(true);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('should check auth via event and redirect if event returns status false', async () => {
    (hasTokens as jest.Mock).mockReturnValue(false);
    (isNative as jest.Mock).mockReturnValue(true);

    const publishWithResponseMock = jest.fn().mockResolvedValue({ status: false });
    (EventManager.getInstance as jest.Mock).mockReturnValue({
      publishWithResponse: publishWithResponseMock
    });
    const mockState: RouterStateSnapshot = { url: routerMock.url } as RouterStateSnapshot;
    const result = await runInInjectionContext(createInjector(routerMock, dynamicRoutingMock), () =>
      authGuard(mockRoute, mockState)
    );

    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/custom-login'], {
      queryParams: { redirectUri: '/current-path' }
    });

    const dynamicRoutingMockDefault = {};
    const mockStateDefault: RouterStateSnapshot = { url: routerMock.url } as RouterStateSnapshot;
    const resultDefault = await runInInjectionContext(createInjector(routerMock, dynamicRoutingMockDefault), () =>
      authGuard(mockRoute, mockStateDefault)
    );

    expect(routerMock.navigate).toHaveBeenCalledWith([AUTH_DEFAULT_PATHS.LOGIN_PATH], {
      queryParams: { redirectUri: '/current-path' }
    });
    expect(resultDefault).toBe(false);
  });

  it('should log error and redirect if event throws', async () => {
    (hasTokens as jest.Mock).mockReturnValue(false);
    (isNative as jest.Mock).mockReturnValue(true);

    const error = new Error('Test error');
    (EventManager.getInstance as jest.Mock).mockReturnValue({
      publishWithResponse: jest.fn().mockRejectedValue(error)
    });
    const consoleErrorSpy = jest.spyOn(LoggerUtils.getInstance(), 'error').mockImplementation(() => undefined);
    const mockState: RouterStateSnapshot = { url: routerMock.url } as RouterStateSnapshot;
    const result = await runInInjectionContext(createInjector(routerMock, dynamicRoutingMock), () =>
      authGuard(mockRoute, mockState)
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(`❌ [Dynamic Routing] Error in CHECK_AUTH: ${error}`);
    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/custom-login'], {
      queryParams: { redirectUri: '/current-path' }
    });

    consoleErrorSpy.mockRestore();
  });
});
