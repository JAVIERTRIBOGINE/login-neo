import { inject, Injectable, } from '@angular/core';
import { TagManager } from '@proteo/tag-manager';
import { LoggerUtils } from '@proteo/logger-utils';
import { TagManagerInputData, TagRequest } from '@proteo/types';
import { TealiumEventDataLogin, TeliumTraceDataLogin, TitleNameLink } from '@app/login/domain/constants/global.constants';
import { TLinkName, TStep } from '@app/login/domain/models/tealium.model';
import { LoginDataService } from './login-data.service';


@Injectable({
  providedIn: 'root'
})

export class TealiumTraceLoginService {

  loginDataService = inject(LoginDataService)

  public sendLoginPageTealiumTrace(nombreLink: TLinkName, paso: TStep, pasoOperativa: TStep) {
    const { ENTORNO, CATEGORIA:{PAGINA, PRODUCTO}, 
     NOMBRE_PRODUCTO, NOMBRE_OPERATIVA,
    NIVEL: {UNO, DOS, TRES} } = TeliumTraceDataLogin;
    const tealiumTrace: TagRequest<TagManagerInputData> = {
      data: {
        canal: this.loginDataService.getTealiumChannel(),
        entorno: ENTORNO,
        nombreLink,
        paso,
        categoriaProducto: PRODUCTO,
        nombreProducto: NOMBRE_PRODUCTO,
        nivel1: UNO,
        nivel2: DOS,
        nivel3: TRES,
        pasoOperativa,
        nombreOperativa: NOMBRE_OPERATIVA,
        categoriaPagina: PAGINA,
        }
    };
    LoggerUtils.getInstance().debug(`Tealium Page Trace`, tealiumTrace);
    TagManager.getInstance().trace(tealiumTrace);
  }
  
  sendLoginTealliumTagEvent(eventTitle: string, eventDescription: string): void {
    const newEvent: TagRequest<TagManagerInputData> = {
      data: {
        nombreLink: TitleNameLink,
        info_click_cta: TealiumEventDataLogin.PREFIX + eventTitle + ':' + eventDescription
      }
    };
    LoggerUtils.getInstance().debug(`Tealium Event Trace`, newEvent);
    TagManager.getInstance().trace(newEvent);
  }
}