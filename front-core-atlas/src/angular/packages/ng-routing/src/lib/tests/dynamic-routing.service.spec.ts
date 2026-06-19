import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { provideDynamicRouting } from '../provider-dynamic-routing';
import { BsApplicationList, BsGenerateRoutesConfig, DynamicRoutingConfig } from '../models/dynamic-routing.model';
import { DynamicRoutingService } from '../services/dynamic-routing.service';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'fake-component',
  template: ``
})
export class FakeComponent {}

const manifest: BsApplicationList = {
  mfe1: {
    appId: 'mfe1App',
    type: 'P4_MFE',
    routeConfig: {
      remoteEntry: 'http://localhost:4200/remoteEntry.js',
      exposedModule: './Mfe1Application',
      nameModule: 'Application',
      routePath: 'mfe1',
      isAuthenticate: false
    },
    payload: {
      data: 'This is example payload send in routing angular'
    }
  },
  mfe2: {
    appId: 'mfe2App',
    type: 'P4_MFE',
    routeConfig: {
      remoteEntry: 'http://localhost:4243/remoteEntry.js',
      exposedModule: './Mfe2Application',
      nameModule: 'AppChildModule',
      routePath: 'mfe2',
      isAuthenticate: false
    },
    payload: {
      data: 'This is example payload send in routing angular'
    }
  }
};

const dynamicRoutingConf: DynamicRoutingConfig = {
  staticRoutes: [
    {
      path: '',
      component: FakeComponent,
      children: []
    }
  ],
  dynamicRoutes: manifest,
  rootPath: '',
  errorRoutePath: 'error'
};

const generateRoutesConf: BsGenerateRoutesConfig = {
  applications: manifest,
  errorRoutePath: 'error',
  rootPath: '',
  featureManager: {
    RELEASE_PROJECT: { KEY: 'release_project_key' },
    MAIN_PROJECT: { KEY: 'main_project_key' }
  },
  auth: {
    LOGIN_PATH: ''
  },
  ulMapping: {
    URLPT: '/test-url/:idItem/urlparams/:otherId'
  },
  initData: {
    language: 'es-ES',
    auth: { OIDC: 'string', OAUTH: 'string' },
    externalData: {},
    initParameters: {},
    analytics: { analyticsId: 'analyticsId', analyticsVersion: 'analyticsVersion' },
    userInfo:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30',
    deviceInfo: { platform: '', platformVersion: '1.0.0', userAgent: '', appVersion: '25.0' }
  }
};

describe('DynamicRoutingService', () => {
  let service: DynamicRoutingService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [provideDynamicRouting(dynamicRoutingConf)]
    });
    service = TestBed.inject(DynamicRoutingService);
    router = TestBed.inject(Router);
  });

  it('should generate routes from mock config', async () => {
    await service.initialize(generateRoutesConf);

    expect(router.config[1].children.length).toEqual(2);
  });

  it('should generate universal-link route', async () => {
    await service.initialize(generateRoutesConf);

    expect(router.config.filter((f) => f.path === 'universal-link'));
  });
});
