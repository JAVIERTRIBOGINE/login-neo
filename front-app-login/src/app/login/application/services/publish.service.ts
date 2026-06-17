
import { inject, Injectable } from '@angular/core';
import { EVENT_DATA_COMUNICATION, LOGIN_EVENTS } from '@app/login/domain/constants/event.enum';
import { EventManager } from '@proteo/event-bus';
import { LoginDataService } from './login-data.service';
import { IEventManager } from '@proteo/types';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class PublishService {
  loginDataService: LoginDataService = inject(LoginDataService);

   publishEvent(event: LOGIN_EVENTS.HELP|LOGIN_EVENTS.FOOTER|LOGIN_EVENTS.ERROR, mode?:boolean ) {
    const eventManager = EventManager.getInstance()
    switch (event) {
      case LOGIN_EVENTS.HELP:
        eventManager.publish( EVENT_DATA_COMUNICATION.OPEN_HELP_MODAL );
        break;
      case LOGIN_EVENTS.FOOTER:
         eventManager.publish(EVENT_DATA_COMUNICATION.SHOW_SHELL_FOOTER, { show: !mode}) 
        break;
      case LOGIN_EVENTS.ERROR:
        eventManager.publish(EVENT_DATA_COMUNICATION.AUTH_ERRO) 
        break;
    }
  }

   publishOauthEvent(event: LOGIN_EVENTS, error: HttpErrorResponse|null = null ) {
    const eventManager = EventManager.getInstance()
    switch (event) {
      case LOGIN_EVENTS.AUTHORIZE:
        this.handleOAUTHResponse(error, true, eventManager )
        break;
      case LOGIN_EVENTS.TOKENS:
        this.handleOAUTHResponse(error, false, eventManager)
        break;
    }
  }

   handleOAUTHResponse(error: HttpErrorResponse|null,  isAuthorize: boolean, eventManager: IEventManager) {
    if (!error) {
       eventManager.publish(
        (isAuthorize? EVENT_DATA_COMUNICATION.AUTHORIZATION: EVENT_DATA_COMUNICATION.TOKENS )
      ) 
    } else {
       eventManager.publish(
        isAuthorize?EVENT_DATA_COMUNICATION.AUTHORIZATION: EVENT_DATA_COMUNICATION.TOKENS, {error}) // agree with team 1
    }
  }
}