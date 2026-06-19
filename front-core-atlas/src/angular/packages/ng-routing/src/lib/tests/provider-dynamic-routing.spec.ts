import { ApplicationInitStatus, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Routes } from '@angular/router';
import { provideDynamicRouting } from '../provider-dynamic-routing';
import { DynamicRoutingService } from '../services/dynamic-routing.service';
import { DYNAMIC_ROUTES, ERROR_ROUTE_PATH, LOCAL_ROUTES, ROOT_PATH } from '../tokens';
import { BsApplicationList, DynamicRoutingConfig } from '../models/dynamic-routing.model';

@Component({
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
      routePath: 'mfe1'
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
      routePath: 'mfe2'
    },
    payload: {
      data: 'This is example payload send in routing angular'
    }
  }
};
const dynamicRoutingConf: DynamicRoutingConfig = {
  staticRoutes: [],
  dynamicRoutes: manifest,
  rootPath: '',
  errorRoutePath: 'error'
};

describe('ProviderDynamicRouting', () => {
  let routes: Routes;
  let fmRoutes: BsApplicationList;
  let rootPath: string;
  let errorRoutePath: string;
  beforeEach(async () => {
    jest.spyOn(DynamicRoutingService.prototype, 'initialize').mockReturnThis();

    TestBed.configureTestingModule({
      providers: [provideDynamicRouting(dynamicRoutingConf)]
    });

    await (TestBed.inject(ApplicationInitStatus) as ApplicationInitStatus).donePromise;

    routes = TestBed.inject(LOCAL_ROUTES);
    fmRoutes = TestBed.inject(DYNAMIC_ROUTES);
    rootPath = TestBed.inject(ROOT_PATH);
    errorRoutePath = TestBed.inject(ERROR_ROUTE_PATH);
  });

  it('should success inject all tokens', () => {
    expect(routes).toEqual([]);
    expect(rootPath).toEqual('');
    expect(errorRoutePath).toEqual(dynamicRoutingConf.errorRoutePath);
  });
});
