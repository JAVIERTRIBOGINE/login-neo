import { ComponentFixture, TestBed } from "@angular/core/testing"
import { LoaderComponent } from "./loader.component"
import { LoginTranslationService } from "@app/login/application/services/login-translation.service";
import { CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";

describe('LoaderComponent', ()=> {
    let fixture: ComponentFixture<LoaderComponent>
    let component: LoaderComponent;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports:[LoaderComponent],
            providers: [LoginTranslationService],
            schemas: [CUSTOM_ELEMENTS_SCHEMA]
        });

        fixture = TestBed.createComponent(LoaderComponent);
        component = fixture.componentInstance;
        
    })

    it('Add two translations in viewInit', ()=> {
        const bsLoading = component.er.nativeElement.querySelector('bs-loading');
        spyOn(component.loginTranslation, 'translateFromKey').and.callFake(key => {
          return  key==='login:APP.STATIC_PAGE.LOADING.MAIN_TEXT'?'main text':'secondary text'
        });

        component.ngAfterViewInit()
        fixture.detectChanges()

        expect(bsLoading.loadingTitle).toEqual('main text');
        expect(bsLoading.loadingText).toEqual('secondary text');

    })
}
)