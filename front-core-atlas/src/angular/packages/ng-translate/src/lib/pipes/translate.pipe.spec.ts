import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injectable, ViewContainerRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { I18n } from '@proteo/i18n-utils';
import { provideTranslate } from '../provide-translate';
import { TranslateService } from '../providers/translate.service';
import { TranslatePipe } from './translate.pipe';

class FakeChangeDetectorRef extends ChangeDetectorRef {
  markForCheck(): void {}

  detach(): void {}

  detectChanges(): void {}

  checkNoChanges(): void {}

  reattach(): void {}
}

@Injectable()
@Component({
  selector: 'lib-app',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ 'TEST' | translate }}`
})
class AppComponent {
  viewContainerRef: ViewContainerRef;

  constructor(viewContainerRef: ViewContainerRef) {
    this.viewContainerRef = viewContainerRef;
  }
}

const translations: any = {
  en_GB: {
    TEST: 'This is a test',
    NESTED: { TEST: 'This is a nested test' },
    TEST_PARAM: 'This is a {{param}}'
  },
  es_ES: {
    TEST: 'Esto es una prueba'
  }
};
const namespace = 'TEST_APP';

describe('TranslatePipe', () => {
  let translate: TranslateService;
  let translatePipe: TranslatePipe;
  let ref: any;

  beforeEach(async () => {
    I18n.getInstance();

    TestBed.configureTestingModule({
      imports: [TranslatePipe, AppComponent],
      providers: [
        provideTranslate({
          namespace,
          translations
        })
      ]
    });
    translate = TestBed.inject(TranslateService);
    await translate.use('en_GB');
    ref = new FakeChangeDetectorRef();
    translatePipe = new TranslatePipe(translate, ref);
  });

  afterEach(() => {
    translate = undefined;
    translatePipe = undefined;
    ref = undefined;
  });

  it('create an instance', () => {
    expect(translatePipe).toBeDefined();
    expect(translatePipe instanceof TranslatePipe).toBeTruthy();
  });

  it('should translate a string', () => {
    expect(translatePipe.transform(`${namespace}:TEST`)).toEqual('This is a test');
  });

  it('should translate nested objects', () => {
    expect(translatePipe.transform(`${namespace}:NESTED.TEST`)).toEqual('This is a nested test');
  });

  it('should translate interpolate params', () => {
    expect(translatePipe.transform(`${namespace}:TEST_PARAM`, { param: 'param test' })).toEqual('This is a param test');
  });

  it('when falsy key, it should return given falsey or non length query', () => {
    expect(translatePipe.transform('')).toEqual('');
    expect(translatePipe.transform(null)).toBeNull();
    expect(translatePipe.transform(undefined)).toBeUndefined();
  });

  it('should update the value when the parameters change', () => {
    jest.spyOn(ref, 'markForCheck').mockImplementation();

    expect(translatePipe.transform(`${namespace}:TEST_PARAM`, { param: 'param test' })).toEqual('This is a param test');
    // same value, shouldn't call mark again
    expect(translatePipe.transform(`${namespace}:TEST_PARAM`, { param: 'param test' })).toEqual('This is a param test');
    // different param, should call mark
    expect(translatePipe.transform(`${namespace}:TEST_PARAM`, { param: 'param test2' })).toEqual('This is a param test2');
    expect(ref.markForCheck).toHaveBeenCalledTimes(2);
  });

  // it("should throw if you don't give an object parameter", () => {
  //   const param = 'param: "with param"';
  //   expect(() => {
  //     translatePipe.transform(`${namespace}:TEST_PARAM`, param);
  //   }).toThrowError(`Wrong parameter in TranslatePipe. Expected a valid Object, received: ${param}`);
  // });

  it('should update translations on lang change', async () => {
    return new Promise<void>(async (resolve) => {
      expect(translatePipe.transform(`${namespace}:TEST`)).toEqual('This is a test');

      const subscription = translate.onLanguageChange.subscribe((res: string) => {
        expect(res).toEqual('es_ES');
        expect(translatePipe.transform(`${namespace}:TEST`)).toEqual('Esto es una prueba');
        subscription.unsubscribe();
        resolve();
      });

      await translate.use('es_ES', true);
    });
  });
});
