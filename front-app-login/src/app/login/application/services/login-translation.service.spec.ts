import { CUSTOM_ELEMENTS_SCHEMA } from "@angular/core"
import { TestBed } from "@angular/core/testing"
import { LoginTranslationService } from "@app/login/application/services/login-translation.service"
import { LOGIN_LANGUAGES } from "@app/login/domain/constants/login-languages.enum"
import { I18n } from "@proteo/i18n-utils"

describe('LoginTranslationService', () => {

    let service!: LoginTranslationService
    beforeEach(async() => {
        TestBed.configureTestingModule({
            providers: [ LoginTranslationService],
            schemas: [CUSTOM_ELEMENTS_SCHEMA]
        });

        service = TestBed.inject(LoginTranslationService);
    });

    it('changeLanguage', ()=> {
        const mockLang = LOGIN_LANGUAGES.CATALAN
        spyOn(I18n.getInstance(), 'use')
        service.changeLanguage(mockLang)
        expect(I18n.getInstance().use).toHaveBeenCalledWith(
            mockLang as string, true
        )
    })

    it('translateFromKey', ()=> {
        const mockKey = 'transKey'
        spyOn(I18n.getInstance(), 't')
        service.translateFromKey(mockKey)
        expect(I18n.getInstance().t).toHaveBeenCalledWith(
           mockKey
        )
    })

    it('getLanguage', ()=> {
        const mockLang = "es_ES";
        spyOnProperty(I18n.getInstance(), 'language', "get").and.returnValue(mockLang)
        const lang = service.getLanguage()
        expect(lang).toEqual(mockLang)
    })

})