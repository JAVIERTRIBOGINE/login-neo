import { TestBed } from '@angular/core/testing';
import { InfoBackendRepository } from '../info-backend.repository';
import { GetInfoModel } from '../../../domain/models/get-info.model';
import { initialize } from '@proteo/data-manager';
import { LoggerUtils } from '@proteo/logger-utils';

jasmine.createSpyObj(LoggerUtils, ['log', 'error', 'warn', 'info', 'debug']);

describe('InfoBackendRepository', () => {
  let repository: InfoBackendRepository;

  beforeAll(async () => {
    await initialize({
      EXTERNAL: {
        HOST: 'https://jsonplaceholder.typicode.com',
        BASE_PATH: '/',
        DRIVER: 'P4'
      }
    });
  });

  beforeEach(() => {
    TestBed.configureTestingModule({});
    repository = new InfoBackendRepository();
  });

  it('should be created', () => {
    expect(repository).toBeTruthy();
  });

  it('should return info if driver exists and data is valid', async () => {
    const mockResponse = new Response(JSON.stringify({ data: { id: '1', name: 'John Doe' } }), {
      status: 200,
      headers: { 'Content-type': 'application/json' }
    });

    spyOn(window, 'fetch').and.returnValue(Promise.resolve(mockResponse));

    const params: GetInfoModel = { id: 1 };

    repository.getInfo(params).subscribe((result) => {
      expect(result).toEqual({ name: 'John Doe' });
    });
  });

  it('should throw error if driver exists but get method fails', () => {
    spyOn(window, 'fetch').and.returnValue(Promise.reject(new Error('Network error')));

    const params: GetInfoModel = { id: 1 };

    repository.getInfo(params).subscribe({
      error: (error) => {
        expect(error.message).toBe('Network error');
      }
    });
  });

  afterAll(() => {
    window.BsDataManager = { driversMap: new Map(), pendingConfigsMap: new Map() };
  });
});

describe('InfoBackendRepository - DataManager not initialize', () => {
  let repository: InfoBackendRepository;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    repository = new InfoBackendRepository();

    await initialize({
      FAKE: {
        HOST: 'https://jsonplaceholder.typicode.com',
        BASE_PATH: '/',
        DRIVER: 'P4'
      }
    });
  });

  it('should throw error if driver does not exist', () => {
    const params: GetInfoModel = { id: 1 };

    repository.getInfo(params).subscribe({
      error: (error) => {
        expect(error.message).toBe('Error load driver in dataManager');
      }
    });
  });
});
