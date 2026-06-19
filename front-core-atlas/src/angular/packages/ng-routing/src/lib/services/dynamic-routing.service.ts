import { setManifest } from '@angular-architects/module-federation';
import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Route, Router, Routes } from '@angular/router';
import { EventManager } from '@proteo/event-bus';
import { LoggerUtils } from '@proteo/logger-utils';
import { isFullProteo } from '@proteo/platform-utils';
import { ReplaySubject, Subject, filter } from 'rxjs';
import { ulMapGuard } from '../guards/ul-map.guard';
import { wildcardRouteGuard } from '../guards/wildcard-route.guard';
import { BsApplicationFMConfig, BsApplicationList, BsGenerateRoutesConfig } from '../models/dynamic-routing.model';
import { AUTH_CONFIG, DYNAMIC_ROUTES, LOCAL_ROUTES, PROTEO_4_INIT_DATA, ROOT_PATH, UL_MAPPING } from '../tokens';
import { buildRoute } from '../utils/build-routes';
import { generateRouteManifest } from '../utils/custom-manifest.mapper';
import { deepClone } from '../utils/deep-clone';
import { FeatureManagerService } from './feature-manager.service';
import { paramsGuard } from '../guards/params.guard';

export class DummyComponent {}

/**
 * Service for dynamically generating and updating routes in Angular.
 */
@Injectable({ providedIn: 'root' })
export class DynamicRoutingService {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private routes = inject(LOCAL_ROUTES);
  private dynamicRoutes = inject(DYNAMIC_ROUTES, { optional: true });
  private rootPath = inject(ROOT_PATH, { optional: true });
  private initData = inject(PROTEO_4_INIT_DATA, { optional: true });
  private featureManagerConfig: BsApplicationFMConfig;
  private featureManagerService = inject(FeatureManagerService);
  public authConfig = inject(AUTH_CONFIG, { optional: true });
  public ulMapping = inject(UL_MAPPING, { optional: true });

  private _changeRouting: Subject<void> = new Subject<void>();

  public changeRouting$ = this._changeRouting.asObservable();
  public _remoteErrors: ReplaySubject<string[]> = new ReplaySubject(1);
  public remoteErrors = [];
  private finalConfigRoutes: BsApplicationList;

  constructor() {
    this.suscribeNavigationEnd();
  }

  public async initialize(config?: BsGenerateRoutesConfig): Promise<void> {
    LoggerUtils.getInstance().info(`🚀 [Dynamic Routing] Generate routes...`);

    if (config) {
      this.dynamicRoutes = this.dynamicRoutes ?? config.applications;
      this.rootPath = this.rootPath ?? config.rootPath;
      this.initData = this.initData ?? config.initData;
      this.authConfig = this.authConfig ?? config.auth;
      this.ulMapping = this.ulMapping ?? config.ulMapping;
      this.featureManagerConfig = this.featureManagerConfig ?? config.featureManager;
    }

    try {
      await this.loadFeatureManager();
      await this.buildRoutes();
    } catch (error) {
      LoggerUtils.getInstance().error(`❌ [Dynamic Routing] Error initializing: ${error}`);
    }
  }

  private async loadFeatureManager(context?: { [key: string]: string }): Promise<void> {
    if (this.featureManagerConfig) {
      if (context) {
        this.featureManagerConfig.CONTEXT = { ...this.featureManagerConfig.CONTEXT, ...context };
      }
      LoggerUtils.getInstance().info(`🔍 [Dynamic Routing] Trying to load data from Feature Manager...`);
      try {
        this.validateFeatureManagerConfig(this.featureManagerConfig);
        this.finalConfigRoutes = await this.featureManagerService.updateRoutes(
          deepClone(this.dynamicRoutes),
          this.featureManagerConfig,
          this.initData
        );
      } catch (error: any) {
        LoggerUtils.getInstance().warn(`⚠️ [Dynamic Routing] Not use Feature Manager: ${error.message}`);
        this.finalConfigRoutes = this.dynamicRoutes;
      }
    } else {
      this.finalConfigRoutes = this.dynamicRoutes;
    }
  }

  private async buildRoutes(): Promise<void> {
    try {
      const manifestGenerated = generateRouteManifest(this.finalConfigRoutes);
      await setManifest(manifestGenerated, true);

      const applicationsCopy = deepClone(this.finalConfigRoutes);
      const angularRoutes: Routes = [];

      Object.keys(applicationsCopy).forEach((key) => {
        const runFunc = buildRoute[applicationsCopy[key].type];
        if (runFunc) {
          angularRoutes.push(runFunc({ app: applicationsCopy[key] }));
        } else {
          runFunc(applicationsCopy[key]);
        }
      });

      const routesBuilded = this.generateRoutes(angularRoutes);
      this.router.resetConfig(routesBuilded);

      this._changeRouting.next();
      LoggerUtils.getInstance().info(`✅ [Dynamic Routing] Routes updated!`);
    } catch (error) {
      LoggerUtils.getInstance().error(`❌ [Dynamic Routing] Error in generateRoutes: ${error}`);
      return error;
    }
  }

  public async rebuildRoutes(context?: { [key: string]: string }): Promise<void> {
    LoggerUtils.getInstance().info('🔄 [DynamicRouting] Rebuilding routes...');

    try {
      await this.loadFeatureManager(context);
      await this.buildRoutes();
    } catch (error) {
      LoggerUtils.getInstance().error(`❌ [Dynamic Routing] Error initializing: ${error}`);
    }
  }

  private generateRoutes(appRoutes: Routes): Routes {
    try {
      let routes = deepClone(this.routes) as Routes;

      const rootRoute = routes.find((route) => route.path === this.rootPath);
      if (!rootRoute) {
        throw new Error(' Not exist rootPath in local routes');
      }

      if (rootRoute.children && rootRoute.children.length > 0) {
        rootRoute.children = [...rootRoute.children, ...appRoutes];
      } else {
        rootRoute.children = appRoutes;
      }

      routes = this.addUniversalLinkGuards(routes);
      this.addParamsGuards(routes);

      const existingWildcardIndex = routes.findIndex((route) => route.path === '**');

      if (existingWildcardIndex !== -1 && !isFullProteo()) {
        routes[existingWildcardIndex] = this.createWildcardRouteWithGuard();
      } else if (!isFullProteo()) {
        routes.push(this.createWildcardRouteWithGuard());
      }

      LoggerUtils.getInstance().info(`✅ [Dynamic Routing] Routes builded! ${JSON.stringify(routes)}`);
      return routes;
    } catch (error) {
      LoggerUtils.getInstance().error(`❌ [Dynamic Routing] Error in buildRoutes: ${error}`);
      return error;
    }
  }

  /**
   * Adds a universal link guard and ulMapGuard to the provided routes.
   */
  private addUniversalLinkGuards(routes: Routes): Routes {
    const ulRoutes: Route = {
      path: 'universal-link',
      canActivate: [ulMapGuard],
      component: DummyComponent
    };

    return [ulRoutes, ...routes];
  }

  private addParamsGuards(routes: Routes): void {
    routes.forEach((route) => {
      if (route.redirectTo) {
        if (route.children) {
          this.addParamsGuards(route.children);
        }
        return;
      }

      route.canActivate = route.canActivate || [];
      if (route.data?.['parameters']?.length && route.data?.['redirectPath']) {
        route.canActivate.push(paramsGuard);
      }
      if (route.children) {
        this.addParamsGuards(route.children);
      }
    });
  }

  /**
   * This functions defines a wildcard route with a guard in Angular.
   * Allows the application to handle unknown routes dynamically and delegate actions to the appropriate event handlers.
   */
  private createWildcardRouteWithGuard(): Route {
    return {
      path: '**',
      canActivate: [wildcardRouteGuard],
      component: DummyComponent
    };
  }

  private suscribeNavigationEnd(): void {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      const payload = {
        method: 'contextChanged',
        data: {
          pageName: this.getCleanRoute()
        }
      };
      LoggerUtils.getInstance().info(`📍 [Dynamic Routing] Router event: ${event}`);

      EventManager.getInstance().publish('CONTEXT_CHANGED', payload);
    });
  }

  public getCleanRoute(): string {
    let current = this.activatedRoute.snapshot;
    const segments: string[] = [];

    while (current) {
      const routePath = current.routeConfig?.path;
      if (routePath) {
        const parts = routePath.split('/').filter((p) => !p.startsWith(':'));
        segments.push(...parts);
      }
      current = current.firstChild ?? null;
    }

    return '/' + segments.join('/');
  }

  private validateFeatureManagerConfig(config: BsApplicationFMConfig) {
    if (!config.RELEASE_PROJECT?.KEY || !config?.MAIN_PROJECT.KEY) {
      throw new Error('Error reading config file for Feature Manager...');
    }
  }
}
