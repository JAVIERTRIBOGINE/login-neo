import { HttpErrorResponse } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { LoginTranslationService } from "./login-translation.service";
import { LoggerUtils } from "@proteo/logger-utils";
import {  ActivatedRoute, Router } from "@angular/router";
import { ROUTE_DATA } from "@app/login/domain/constants/path.constant";

@Injectable()
export class MessageService {
    router: Router =inject(Router);
    route: ActivatedRoute = inject(ActivatedRoute);

    loginTranslationService = inject(LoginTranslationService);

    handleError(error: HttpErrorResponse) {
        const msg = error?.error || error?.message || this.loginTranslationService.translateFromKey('login:APP.STATIC_PAGE.ERROR.TITLE');
        LoggerUtils.getInstance().error('error', msg);
        this.router.navigate([`../${ROUTE_DATA.ERROR}`], {relativeTo: this.route})
    }
}