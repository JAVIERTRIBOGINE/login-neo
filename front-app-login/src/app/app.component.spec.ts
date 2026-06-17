import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { BaseAppConfig } from '@proteo/types';
import { PROTEO_APP_CONF } from '@proteo/ng-bootstrap';
import { LoggerUtils } from '@proteo/logger-utils';
import { I18n, Languages } from '@proteo/i18n-utils';
import { LOGIN_LANGUAGES } from './login/domain/constants/login-languages.enum';

// const mockIsFullProteo = jasmine.createSpy<()=>boolean>('isFullProteo', () => true)


describe('AppComponent', () => {
  beforeEach(async () => {
    I18n.initInstance();
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: PROTEO_APP_CONF,
          useValue: { APP_CONFIG: { DEFAULT_LOCALE: 'en' } } as BaseAppConfig }
        ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should log initialization message on ngOnInit', () => {
    const loggerSpy = jasmine.createSpyObj(LoggerUtils.getInstance, ['debug']);

    spyOn(LoggerUtils, 'getInstance').and.returnValue(loggerSpy);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(loggerSpy.debug).toHaveBeenCalledWith('[LoginApplication] AppComponent initialized');
  });

  it('should hide the loading element on ngAfterViewInit', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const loadingElement = document.createElement('bs-loading');
    document.body.appendChild(loadingElement);
    fixture.detectChanges();
    app.ngAfterViewInit();
    expect(loadingElement.classList.contains('hidden')).toBeTrue();
    document.body.removeChild(loadingElement);
  });

  it('should log a message if the loading element does not exist on ngAfterViewInit', () => {
    const loggerSpy = jasmine.createSpyObj(LoggerUtils.getInstance, ['debug']);
    spyOn(LoggerUtils, 'getInstance').and.returnValue(loggerSpy);

    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();
    app.ngAfterViewInit();
    expect(loggerSpy.debug).toHaveBeenCalledWith('[LoginApplication] Not exists initial loader element');
  });

  it('isFullProgeo true -> default language', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    spyOn(app, 'isFullProteo').and.returnValue(true)
    spyOn(I18n.getInstance(), 'use');

    app.ngOnInit();
    expect(I18n.getInstance().use).toHaveBeenCalledWith(
      Languages[(app['config'] as BaseAppConfig).APP_CONFIG.DEFAULT_LOCALE].language
    )
  })

  it('isFullProgeo false -> spanish language', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    spyOn(app, 'isFullProteo').and.returnValue(false)
    spyOn(I18n.getInstance(), 'use');

    app.ngOnInit();
    expect(I18n.getInstance().use).toHaveBeenCalledWith(LOGIN_LANGUAGES.SPANISH)
  })
});
