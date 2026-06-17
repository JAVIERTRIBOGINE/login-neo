import { TestBed } from "@angular/core/testing";
import { PublishService } from "./publish.service"
import { EventManager } from "@proteo/event-bus";
import { EVENT_DATA_COMUNICATION, LOGIN_EVENTS } from "@app/login/domain/constants/event.enum";
import { HttpErrorResponse } from "@angular/common/http";
import { IEventManager } from "@proteo/types";

describe('PublishService',  () => {
    let service!: PublishService;
    let eventManagerMock!: jasmine.SpyObj<EventManager>

    beforeEach( async () => {
        eventManagerMock = jasmine.createSpyObj('EventManager',[ 'publish'])
        spyOn(EventManager, 'getInstance').and.returnValue(eventManagerMock as unknown as IEventManager);
        TestBed.configureTestingModule({
            providers: [
                PublishService
            ]
        })
        service = TestBed.inject(PublishService)
    })

    it('publishEvent help', async () => {
        const mockEvent = LOGIN_EVENTS.HELP;
         service.publishEvent(mockEvent);
        expect(eventManagerMock.publish).toHaveBeenCalledOnceWith(EVENT_DATA_COMUNICATION.OPEN_HELP_MODAL)
    })

    it('publishEvent Error', async () => {
        const mockEvent = LOGIN_EVENTS.ERROR;
         service.publishEvent(mockEvent);
        expect(eventManagerMock.publish).toHaveBeenCalledOnceWith(EVENT_DATA_COMUNICATION.AUTH_ERRO)
    })

    it('publishEvent footer', async () => {
        const mockEvent = LOGIN_EVENTS.FOOTER;
         service.publishEvent(mockEvent, false);
        expect(eventManagerMock.publish).toHaveBeenCalledOnceWith(EVENT_DATA_COMUNICATION.SHOW_SHELL_FOOTER, {show: true})
    })

    it('publishEvent OauthEvent Authorize', async () => {
        spyOn(service, 'handleOAUTHResponse')
        const mockEvent = LOGIN_EVENTS.AUTHORIZE;
        const mockeventManager = EventManager.getInstance()
        const mockError = new HttpErrorResponse({status: 400,error: 'mock error'})
         service.publishOauthEvent(mockEvent, mockError);

        expect(service.handleOAUTHResponse).toHaveBeenCalledOnceWith( mockError,true, mockeventManager)
    })

    it('publishEvent Tokens', async () => {
        spyOn(service, 'handleOAUTHResponse')
        const mockEvent = LOGIN_EVENTS.TOKENS;
        const mockeventManager = EventManager.getInstance()
        const mockError = new HttpErrorResponse({status: 400,error: 'mock error'})
        await service.publishOauthEvent(mockEvent, mockError);

        expect(service.handleOAUTHResponse).toHaveBeenCalledOnceWith( mockError, false, mockeventManager)
    })

    it("handleOAUTHResponse - AUTHORIZATION", () => {
        const mockEventManager = EventManager.getInstance();
        const mockError = new HttpErrorResponse({status: 400,error: 'mock error'})
        service.handleOAUTHResponse(mockError, true, mockEventManager)
        expect(eventManagerMock.publish).toHaveBeenCalledWith(EVENT_DATA_COMUNICATION.AUTHORIZATION, {error:mockError})
        service.handleOAUTHResponse(null, true, mockEventManager)
        expect(eventManagerMock.publish).toHaveBeenCalledWith(EVENT_DATA_COMUNICATION.AUTHORIZATION)
    })

    it("handleOAUTHResponse - TOKENS", () => {
        const mockEventManager = EventManager.getInstance();
        const mockError = new HttpErrorResponse({status: 400,error: 'mock error'})
        service.handleOAUTHResponse(mockError, false, mockEventManager)
        expect(eventManagerMock.publish).toHaveBeenCalledWith(EVENT_DATA_COMUNICATION.TOKENS, {error:mockError})
        service.handleOAUTHResponse(null, false, mockEventManager)
        expect(eventManagerMock.publish).toHaveBeenCalledWith(EVENT_DATA_COMUNICATION.TOKENS)
    })

})