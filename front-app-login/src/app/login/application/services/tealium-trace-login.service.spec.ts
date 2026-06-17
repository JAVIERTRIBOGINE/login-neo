import { TestBed } from '@angular/core/testing';
import { TealiumTraceLoginService } from './tealium-trace-login.service';
import { TagManager } from '@proteo/tag-manager';
import { TealiumEventDataLogin } from '@app/login/domain/constants/global.constants';

describe('TealiumService', () => {
  let service: TealiumTraceLoginService;
  let tagManagerSpy: jasmine.SpyObj<TagManager>;

  beforeEach(() => {
    tagManagerSpy = jasmine.createSpyObj('TagManager', ['trace']);

    TestBed.configureTestingModule({
      providers: [ { provide: TagManager, useValue: tagManagerSpy }]
    });

    service = TestBed.inject(TealiumTraceLoginService);
  });

  it('should call the dispatchEvent method', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const  tagManagerMock: any = {
             trace: jasmine.createSpy('trace'),  
         };
    spyOn(TagManager, 'getInstance').and.returnValue(tagManagerMock);
    service.sendLoginPageTealiumTrace( 'operativa_inicio', 'inicio', 'inicio');
    expect(tagManagerSpy.trace).not.toHaveBeenCalled();
  });

  it('should call the dispatchEvent method', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const  tagManagerMock: any = {
             trace: jasmine.createSpy('trace'),  
         };
    spyOn(TagManager, 'getInstance').and.returnValue(tagManagerMock);
    service.sendLoginTealliumTagEvent(TealiumEventDataLogin.TITLE, TealiumEventDataLogin.ACTION['HELP']);
    expect(tagManagerSpy.trace).not.toHaveBeenCalled();
  });
  

});