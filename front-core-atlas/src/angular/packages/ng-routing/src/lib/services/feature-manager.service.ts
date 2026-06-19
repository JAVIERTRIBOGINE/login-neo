import { Injectable } from '@angular/core';
import { BsApplication, BsApplicationFMConfig, BsApplicationList, BsMicrofrontend, CheckAuthResponse } from '../models/dynamic-routing.model';
import { FeatureManager } from '@proteo/feature-manager';
import { LoggerUtils } from '@proteo/logger-utils';
import { hasTokens } from '@proteo/data-manager';
import { isNative } from '@proteo/platform-utils';
import { EventManager } from '@proteo/event-bus';
import { EnumEnvironments, FeatureManagerContext, InitEventResponsePayload } from '@proteo/types';
import { getUserInfo, extractUserInfoFromToken } from '@proteo/authorization-utils';
import { changeRemoteEntry } from '../utils/transform-remoteentry-url';
import { getCookie } from '@proteo/cookie-utils'
import { getEnvironment } from '@proteo/environment-detection-utils'

const DEFAULT_FLAGS: string[] = ['version', 'killswitch', 'maintenance'];
const NAMESPACE_MAIN_PROJECT = 'MAIN_PROJECT';
const NAMESPACE_RELEASE_PROJECT = 'RELEASE_PROJECT';
const RELEASE_COOKIE = '25df5dad0a39ec8a6a36be8dcb9153806ca9691401dfb28bca8aab9d85fbd876';

interface IFlags {
  killswitch: string;
  maintenance: string;
  version: string;
}

interface ExternalData {
  userContext: {
    dni: string;
  };
}

@Injectable({ providedIn: 'root' })
export class FeatureManagerService {
  async updateRoutes(listRoutes: BsApplicationList, config: BsApplicationFMConfig, initData: InitEventResponsePayload): Promise<BsApplicationList> {
    const array: string[] = Object.keys(listRoutes);

    let context: FeatureManagerContext = {
      ...config?.CONTEXT,
      ...initData.deviceInfo,
      ...(initData.userInfo ? extractUserInfoFromToken(initData.userInfo) : {})
    };

    if (!context?.['dni'] && (initData.externalData as ExternalData)?.userContext?.dni) {
      context = {
        ...context,
        dni: (initData.externalData as { userContext?: { dni?: string } })?.userContext?.dni
      };
    }

    context = await this.updateContextWithUserInfo(context);
    const releasesFlags = await this.getReleases(config, context);
    let releaseContext = this.getReleasesFlags(context, releasesFlags);
    const releaseCookie = this.getReleaseCookie();

    if (releaseCookie !== '') {
      LoggerUtils.getInstance().info(`ℹ️ [DynamicRouting - Pilotaje] Use cookie context for piloting...`);
      releaseContext = releaseCookie;
    }

    if (releaseContext) {
      context = {
        ...context,
        releases: releaseContext
      };
    }

    await this.initializeFeatureManager(config.MAIN_PROJECT.KEY);

    for (const key of array) {
      const operative = listRoutes[key];
      await this.updateOperativeRoute(operative, context);
    }

    return listRoutes;
  }

  private getReleaseCookie(): string {
    if (getEnvironment() === EnumEnvironments.PRO) {
      return '';
    }

    const cookie = getCookie(RELEASE_COOKIE);

    if (!cookie) {
      return '';
    }

    LoggerUtils.getInstance().info(`ℹ️ [DynamicRouting - Pilotaje] Return release cookie with value: ${cookie}`);
    return cookie;
  }

  private async updateContextWithUserInfo(context: FeatureManagerContext): Promise<FeatureManagerContext> {
    let isAuthenticated: boolean = hasTokens();
    const native = isNative();

    if (!isAuthenticated && native) {
      try {
        const eventResponse: CheckAuthResponse = await EventManager.getInstance().publishWithResponse('CHECK_AUTH', { method: 'checkAuth' });
        isAuthenticated = eventResponse.status === true;
      } catch (error) {
        LoggerUtils.getInstance().error(`❌ [Feature Manager] Error in CHECK_AUTH: ${error}`);
        isAuthenticated = false;
      }
    }

    if (isAuthenticated) {
      try {
        const userContext = await getUserInfo();

        if (userContext) {
          context = {
            ...context,
            ...userContext
          };
        }
      } catch (error: any) {
        LoggerUtils.getInstance().info(`[DynamicRouting - Pilotaje] Error trying get userInfo and add to context => `, error);
      }
    }

    return context;
  }

  private async initializeFeatureManager(key: string): Promise<void> {
    await FeatureManager.getInstance().register(NAMESPACE_MAIN_PROJECT, key);
  }

  private async updateOperativeRoute(operative: BsApplication, context: FeatureManagerContext): Promise<void> {
    const routeConfig = operative.routeConfig;

    if (routeConfig.isPiloting) {
      try {
        const { killswitch, maintenance, version } = this.readFeatureManager(operative, context);

        if (killswitch && killswitch === 'true') {
          operative.type = 'MAINTENANCE';
          operative.maintenance = 'all_services_down';
          LoggerUtils.getInstance().debug(`☠️ [DynamicRouting - Pilotaje] Killswitch activated for: ${operative.appId}`);
          return;
        }

        if (maintenance && maintenance !== 'disabled') {
          operative.type = 'MAINTENANCE';
          operative.maintenance = maintenance;
          LoggerUtils.getInstance().debug(`🚧 [DynamicRouting - Pilotaje] Maintenance activated for: ${operative.appId}`);
          return;
        }

        if (version === '') {
          LoggerUtils.getInstance().debug(`ℹ️ [DynamicRouting - Pilotaje] Omit piloting from config for: ${operative.appId}`);
          return;
        }

        if (version !== 'native') {
          operative.type = 'P4_MFE';
          const routeConfig = operative.routeConfig as BsMicrofrontend;
          const remoteEntry = routeConfig.remoteEntry;
          (operative.routeConfig as BsMicrofrontend).remoteEntry = changeRemoteEntry(remoteEntry, version, operative.appId);
          LoggerUtils.getInstance().debug(`✅ [DynamicRouting - Pilotaje] Piloting to version ${version} for ${operative.appId}`);
          return;
        }

        if (operative.type === 'P4_MFE') {
          operative.type = 'NATIVE'
          LoggerUtils.getInstance().debug(`📱 [DynamicRouting - Pilotaje] Piloting to native for ${operative.appId}`);
        }

      } catch (error) {
        LoggerUtils.getInstance().error(
          `❌ [DynamicRouting - Pilotaje] ${operative.appId} error try to change or read feature manager flags | ${error}`
        );
      }
    } else {
      LoggerUtils.getInstance().debug(`ℹ️ [DynamicRouting - Pilotaje] Omit piloting from config for: ${operative.appId}`);
    }
  }

  private async getReleases(config: BsApplicationFMConfig, context: FeatureManagerContext): Promise<string> {
    await FeatureManager.getInstance().register(NAMESPACE_RELEASE_PROJECT, config.RELEASE_PROJECT.KEY);

    try {
      return Promise.resolve(FeatureManager.getInstance().value('releases', { context, defaultValue: '' }));
    } catch (error) {
      LoggerUtils.getInstance().error(`❌ [DynamicRouting - Pilotaje] Error to get release project flags`);
      return Promise.reject('Not found releases');
    }
  }

  private getReleasesFlags(context: FeatureManagerContext, releases: string): string {
    const flags: string[] = releases.split(',');
    const result: string[] = [];

    flags.forEach((flag) => {
      const value = FeatureManager.getInstance().value(flag, { context, defaultValue: '' });
      if (value !== '') {
        result.push(value);
      }
    });

    return result.join(',')
  }

  private readFeatureManager(operative: BsApplication, context: FeatureManagerContext): IFlags {
    const flags: Partial<IFlags> = {};

    for (const flag of DEFAULT_FLAGS) {
      flags[flag] = FeatureManager.getInstance().value(`front.${operative.appId}.${flag}`, { defaultValue: '', context });
    }

    return flags as IFlags;
  }

}
