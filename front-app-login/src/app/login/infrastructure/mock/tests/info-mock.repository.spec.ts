import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { InfoMockRepository } from '../info-mock.repository';
import { GetInfoModel } from '../../../domain/models/get-info.model';
import { InfoModel } from '../../../domain/models/info.model';

describe('InfoMockRepository', () => {
  let repository: InfoMockRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    repository = new InfoMockRepository();
  });

  it('should be created', () => {
    expect(repository).toBeTruthy();
  });

  it('should return mock info', (done) => {
    const params: GetInfoModel = { id: 1 };
    const expectedInfo: InfoModel = { name: 'User 1 Mock' };

    repository.getInfo(params).subscribe((result) => {
      expect(result).toEqual(expectedInfo);
      done();
    });
  });

  it('should return error not found id', (done) => {
    const params: GetInfoModel = { id: 99 };

    repository.getInfo(params).subscribe({
      error: (error) => {
        expect(error).toBeDefined();
        done();
      }
    });
  });

  it('should handle different params', (done) => {
    const params: GetInfoModel = { id: 4 };
    const expectedInfo: InfoModel = { name: 'User 4 Mock' };

    repository.getInfo(params).subscribe((result) => {
      expect(result).toEqual(expectedInfo);
      done();
    });
  });

  it('should return observable', () => {
    const params: GetInfoModel = { id: 1 };
    const result = repository.getInfo(params);
    expect(result).toBeInstanceOf(of().constructor);
  });
});
