import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { LegacyLoaderComponent } from '../legacy-loader.component';

const URL = 'https://apps.cdn.int.aws.bancsabadell.com';

describe('LegacyLoaderComponent Test', () => {
  let activatedRoute: ActivatedRoute;
  let sanitizer: DomSanitizer;
  let fixture: ComponentFixture<LegacyLoaderComponent>;
  let component: LegacyLoaderComponent;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockIframeEl: any;

  beforeEach(() => {
    mockIframeEl = {
      nativeElement: {
        height: '',
        src: '',
        contentWindow: {
          document: {
            dispatchEvent: jest.fn()
          }
        }
      }
    };

    TestBed.configureTestingModule({
      imports: [RouterTestingModule, LegacyLoaderComponent]
    });

    activatedRoute = TestBed.inject(ActivatedRoute);
    sanitizer = TestBed.inject(DomSanitizer);

    fixture = TestBed.createComponent(LegacyLoaderComponent);
    component = fixture.componentInstance;
    component.iframeEl = mockIframeEl;

    component.data = {
      routePath: `${URL}/data`,
      payload: {}
    };

    fixture.detectChanges();
  });

  it('should be created', () => {
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should sanitize url from snapshot', () => {
    activatedRoute.snapshot.data = {
      routeConfig: {
        url: URL
      }
    };

    component.ngOnInit();
    fixture.detectChanges();

    expect(component.safeUrl).toEqual(sanitizer.bypassSecurityTrustResourceUrl(URL));
  });

  it('should sanitize url from input', () => {
    component.data = {
      routePath: `${URL}/data`,
      payload: {}
    };
    component.ngOnInit();

    fixture.detectChanges();
    expect(component.safeUrl).toEqual(sanitizer.bypassSecurityTrustResourceUrl(`${URL}/data`));
  });
});
