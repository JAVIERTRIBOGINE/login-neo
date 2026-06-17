import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { GetInfo } from '../get-info.usecase';
import { InfoRepository } from '../../repositories/info.repository';
import { GetInfoModel } from '../../models/get-info.model';
import { InfoModel } from '../../models/info.model';

describe('GetInfo UseCase', () => {
  let useCase: GetInfo;
  let repository: jasmine.SpyObj<InfoRepository>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('InfoRepository', ['getInfo']);

    TestBed.configureTestingModule({
      providers: [GetInfo, { provide: InfoRepository, useValue: spy }]
    });

    useCase = TestBed.inject(GetInfo);
    repository = TestBed.inject(InfoRepository) as jasmine.SpyObj<InfoRepository>;
  });

  it('should be created', () => {
    expect(useCase).toBeTruthy();
  });

  it('should call getInfo on the repository with correct parameters', () => {
    const params: GetInfoModel = { id: 1 };
    const expectedInfo: InfoModel = { name: 'John Doe' };

    repository.getInfo.and.returnValue(of(expectedInfo));

    useCase.execute(params).subscribe((result) => {
      expect(result).toEqual(expectedInfo);
    });

    expect(repository.getInfo).toHaveBeenCalledWith(params);
  });

  it('should handle empty parameters', () => {
    const params: GetInfoModel = { id: 1 };
    const expectedInfo: InfoModel = { name: 'Unknown' };

    repository.getInfo.and.returnValue(of(expectedInfo));

    useCase.execute(params).subscribe((result) => {
      expect(result).toEqual(expectedInfo);
    });

    expect(repository.getInfo).toHaveBeenCalledWith(params);
  });

  it('should handle null parameters', () => {
    const params: GetInfoModel = { id: 0 };
    const expectedInfo: InfoModel = { name: 'Unknown' };

    repository.getInfo.and.returnValue(of(expectedInfo));

    useCase.execute(params).subscribe((result) => {
      expect(result).toEqual(expectedInfo);
    });

    expect(repository.getInfo).toHaveBeenCalledWith(params);
  });

  it('should handle repository errors', () => {
    const params: GetInfoModel = { id: 1 };
    const errorResponse = new Error('Repository error');

    repository.getInfo.and.returnValue(throwError(() => errorResponse));

    useCase.execute(params).subscribe({
      error: (error) => {
        expect(error).toEqual(errorResponse);
      }
    });

    expect(repository.getInfo).toHaveBeenCalledWith(params);
  });
});
