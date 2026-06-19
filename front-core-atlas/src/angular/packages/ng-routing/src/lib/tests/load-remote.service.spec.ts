import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BsApplicationList, BsMicrofrontend, RemoteStatus } from '../models/dynamic-routing.model';
import { ModuleFederationWrapper } from '../utils/module.federation';
import { LoadRemoteService } from '../services/load-remote.service';

const loadRemoteModuleOptions: BsApplicationList = {
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
  }
};

const microfrontend: BsMicrofrontend = {
  remoteEntry: 'http://localhost:4200/remoteEntry.js',
  exposedModule: './Mfe1Application',
  nameModule: 'Application',
  routePath: 'mfe1'
};

const fakeModule: any = {};
const remoteModule: any = {
  FakeModule: fakeModule
};

// let response = new Response(JSON.stringify({}), { status: 200, statusText: 'OK' });
// global.fetch = jest.fn().mockImplementation(() => Promise.resolve({ status: 200, statusText: 'OK' }));

describe('LoadRemoteService', () => {
  let service: LoadRemoteService;
  let http: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [LoadRemoteService]
    });
    service = TestBed.inject(LoadRemoteService);
    http = TestBed.inject(HttpClient);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should success at check is remote status', async () => {
    global.fetch = jest.fn().mockImplementation(() => Promise.resolve({ status: 200, statusText: 'OK' }));

    // jest.spyOn(window, 'fetch').mockImplementation(jest.fn().mockImplementation(() => Promise.resolve({ status: 200, statusText: 'OK' })));
    const result = await service.checkRemoteIsAvailable('http://localhost:4200');
    jest;
    expect(result).toEqual(RemoteStatus.AVAILABLE);
  });

  it('should fail at check is remote status ', async () => {
    global.fetch = jest.fn().mockImplementation(() => Promise.resolve());
    // jest.spyOn(window, 'fetch').mockImplementation(jest.fn().mockImplementation(() => Promise.resolve({ status: 404, statusText: 'NOT_OK' })));

    const result = await service.checkRemoteIsAvailable('http://localhost:4200');

    expect(result).toEqual(RemoteStatus.NOT_AVAILABLE);
  });

  it('should success get remote module', async () => {
    const spy = jest.spyOn(ModuleFederationWrapper, 'loadRemoteModule').mockReturnValue(Promise.resolve(remoteModule));

    const result = await service.getRemoteModule(microfrontend);

    expect(spy).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('should failed get remote module', async () => {
    const spy = jest.spyOn(ModuleFederationWrapper, 'loadRemoteModule').mockReturnValue(Promise.reject());

    const result = await service.getRemoteModule(microfrontend);

    expect(spy).toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
