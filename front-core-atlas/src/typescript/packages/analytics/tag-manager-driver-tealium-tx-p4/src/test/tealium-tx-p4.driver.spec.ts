import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { TealiumTxP4Driver } from '../tealium-tx-p4.driver.js';
import { LoggerUtils } from '@proteo/logger-utils';
import type { Mock, MockInstance } from 'jest-mock';
import type { TagManagerDriverConfiguration } from '@proteo/types';

const mockConf: TagManagerDriverConfiguration = {
  class: ['mockClass']
};

const mockConf2: TagManagerDriverConfiguration = {
  class: ['mockClass2']
};

const mockBsSend = jest.fn();
const mockBsSendExperience = jest.fn();
const mockError = jest.fn();

describe('tealium-tx-p4.driver', () => {
  let tealiumDriver: TealiumTxP4Driver;
  let appendChildSpy: MockInstance<any>;
  let getElementByIdSpy: MockInstance<any>;
  let scriptsExist: boolean;

  beforeEach(() => {
    jest.clearAllMocks();
    LoggerUtils.prototype.error = mockError;
    tealiumDriver = new TealiumTxP4Driver(mockConf);
    appendChildSpy = jest.spyOn(document.head!, 'appendChild');
    appendChildSpy.mockImplementation((node: Node): Node => {
      //@ts-ignore not null under this testing cases
      (node as HTMLScriptElement).onload();
      return node;
    });

    scriptsExist = true;
    getElementByIdSpy = jest.spyOn(document, 'getElementById');
    getElementByIdSpy.mockImplementation((_elementId: string): HTMLElement | null => {
      return scriptsExist as any;
    });

    window.bsSend = mockBsSend;
    window.bsSendExperience = mockBsSendExperience;
  });

  it('should set constructor properties', async () => {
    expect.assertions(2);
    tealiumDriver = new TealiumTxP4Driver(mockConf);
    expect((tealiumDriver as any)._config).toStrictEqual(mockConf);
    expect((tealiumDriver as any)._dataLayer).toStrictEqual({});
  });

  describe('setup', () => {
    let initializeTealiumSpy: Mock<any>;

    beforeEach(() => {
      const initializeTealium = Reflect.get(tealiumDriver, 'initializeTealium').bind(tealiumDriver);
      initializeTealiumSpy = jest.fn(initializeTealium);
      Reflect.set(tealiumDriver, 'initializeTealium', initializeTealiumSpy);
    });

    it('should replace conf class if conf param is set', async () => {
      expect.assertions(1);
      tealiumDriver.setup(mockConf2);
      expect((tealiumDriver as any)._config.class).toStrictEqual(mockConf2.class);
    });

    it('should keep existing conf class if conf is not properly set', async () => {
      expect.assertions(1);
      tealiumDriver.setup(undefined as unknown as TagManagerDriverConfiguration);
      expect((tealiumDriver as any)._config.class).toStrictEqual(mockConf.class);
    });

    it('should update dataLayer with isIframe info', async () => {
      expect.assertions(1);
      tealiumDriver.setup(mockConf);
      expect((tealiumDriver as any)._dataLayer).toStrictEqual({ pageInfo: { isIframe: false } });
    });

    it('should set loaded flag properties if scripts are already included', async () => {
      expect.assertions(3);
      tealiumDriver.setup(mockConf);
      const loaded: Promise<boolean> = Reflect.get(tealiumDriver, '_isLoaded');
      const isLoaded: boolean = await loaded;
      const traceInitialized: boolean = Reflect.get(tealiumDriver, '_traceInitialized');

      expect(initializeTealiumSpy).not.toHaveBeenCalled();
      expect(isLoaded).toBe(true);
      expect(traceInitialized).toBe(true);
    });

    describe('initializeTealium', () => {
      beforeEach(() => {
        scriptsExist = false;
      });

      it('should run initializeTealium if scripts are not included', async () => {
        expect.assertions(1);
        tealiumDriver.setup(mockConf);
        expect(initializeTealiumSpy).toHaveBeenCalled();
      });

      it('should initialize driver properly if both script injections work', async () => {
        expect.assertions(4);

        tealiumDriver.setup(mockConf);
        const loaded: Promise<boolean> = Reflect.get(tealiumDriver, '_isLoaded');
        const isLoaded: boolean = await loaded;

        expect(initializeTealiumSpy).toHaveBeenCalled();
        expect(appendChildSpy).toHaveBeenCalledTimes(2);
        expect(mockError).not.toHaveBeenCalled();
        expect(isLoaded).toBe(true);
      });

      it('should fail setup if first script (sync) injection fails', async () => {
        expect.assertions(5);
        const appendChildSpy = jest.spyOn(document.head!, 'appendChild');
        appendChildSpy.mockImplementation((node: Node): Node => {
          if ((node as HTMLScriptElement).id === 'tealiumTxP4SyncScript') {
            //@ts-ignore not null under this testing cases
            (node as HTMLScriptElement).onerror();
          } else {
            //@ts-ignore not null under this testing cases
            (node as HTMLScriptElement).onload();
          }
          return node;
        });

        tealiumDriver.setup(mockConf);
        const loaded: Promise<boolean> = Reflect.get(tealiumDriver, '_isLoaded');
        const isLoaded: boolean = await loaded;

        expect(initializeTealiumSpy).toHaveBeenCalled();
        expect(appendChildSpy).toHaveBeenCalledTimes(1);
        expect(mockError).toHaveBeenCalledTimes(1);
        expect(mockError).toHaveBeenCalledWith('[TealiumTxP4Driver] utag sync script failed to load false,script-error', {
          remoteLogger: true,
          type: 'application'
        });
        expect(isLoaded).toBe(false);
      });

      it('should fail setup if second script injection fails', async () => {
        expect.assertions(5);
        const appendChildSpy = jest.spyOn(document.head!, 'appendChild');
        appendChildSpy.mockImplementation((node: Node): Node => {
          if ((node as HTMLScriptElement).id === 'tealiumTxP4Script') {
            //@ts-ignore not null under this testing cases
            (node as HTMLScriptElement).onerror();
          } else {
            //@ts-ignore not null under this testing cases
            (node as HTMLScriptElement).onload();
          }
          return node;
        });

        tealiumDriver.setup({});
        const loaded: Promise<boolean> = Reflect.get(tealiumDriver, '_isLoaded');
        const isLoaded: boolean = await loaded;

        expect(initializeTealiumSpy).toHaveBeenCalled();
        expect(appendChildSpy).toHaveBeenCalledTimes(2);
        expect(mockError).toHaveBeenCalledTimes(1);
        expect(mockError).toHaveBeenCalledWith('[TealiumTxP4Driver] utag script failed to load false,script-error', {
          remoteLogger: true,
          type: 'application'
        });
        expect(isLoaded).toBe(false);
      });

      it('should not set traceInitialized until proper event is received', async () => {
        expect.assertions(5);

        tealiumDriver.setup(mockConf);
        let traceInitialized: boolean = Reflect.get(tealiumDriver, '_traceInitialized');

        expect(initializeTealiumSpy).toHaveBeenCalled();
        expect(appendChildSpy).toHaveBeenCalledTimes(2);
        expect(mockError).not.toHaveBeenCalled();
        expect(traceInitialized).toBe(false);
        document.dispatchEvent(new Event(TealiumTxP4Driver.TRACE_INIT_EVENT));
        traceInitialized = Reflect.get(tealiumDriver, '_traceInitialized');
        expect(traceInitialized).toBe(true);
      });

      it('should not set traceExperienceInitialized until proper event is received', async () => {
        expect.assertions(5);

        tealiumDriver.setup(mockConf);
        let traceExperienceInitialized: boolean = Reflect.get(tealiumDriver, '_traceExperienceInitialized');

        expect(initializeTealiumSpy).toHaveBeenCalled();
        expect(appendChildSpy).toHaveBeenCalledTimes(2);
        expect(mockError).not.toHaveBeenCalled();
        expect(traceExperienceInitialized).toBe(false);
        document.dispatchEvent(new Event(TealiumTxP4Driver.TRACE_EXPERIENCE_INIT_EVENT));
        traceExperienceInitialized = Reflect.get(tealiumDriver, '_traceExperienceInitialized');
        expect(traceExperienceInitialized).toBe(true);
      });

      it('should catch unexpected errors when initializing', async () => {
        expect.assertions(2);
        const createElementSpy = jest.spyOn(document, 'createElement');
        createElementSpy.mockImplementationOnce((_tagName: string, _options?: any): HTMLElement => {
          throw new Error();
        });
        tealiumDriver.setup(mockConf);
        expect(mockError).toHaveBeenCalledTimes(1);
        expect(mockError).toHaveBeenCalledWith('[TealiumTxP4Driver] tag manager cannot be initialized Error', {
          remoteLogger: true,
          type: 'application'
        });
      });
    });
  });

  describe('trace', () => {
    it('should fail when bsSend not initialized', async () => {
      expect.assertions(2);
      Reflect.set(tealiumDriver, '_isLoaded', Promise.resolve(true));
      await tealiumDriver.trace({ data: { myTraceStructure: 'myTraceData' } });

      expect(mockError).toHaveBeenCalledTimes(1);
      expect(mockError).toHaveBeenCalledWith('[TealiumTxP4Driver] [trace] driver is not properly initialized, bsSend method not initialized', {
        remoteLogger: true,
        type: 'application'
      });
    });

    it('should fail when not loaded', async () => {
      expect.assertions(2);
      Reflect.set(tealiumDriver, '_traceInitialized', true);
      await tealiumDriver.trace({ data: { myTraceStructure: 'myTraceData' } });

      expect(mockError).toHaveBeenCalledTimes(1);
      expect(mockError).toHaveBeenCalledWith('[TealiumTxP4Driver] [trace] driver is not properly initialized, scripts not loaded', {
        remoteLogger: true,
        type: 'application'
      });
    });

    it('should fail when bsSend not available', async () => {
      expect.assertions(1);
      tealiumDriver.setup(mockConf);
      delete window.bsSend;
      await tealiumDriver.trace({ data: { myTraceStructure: 'myTraceData' } });

      expect(mockError).toHaveBeenCalledWith('[TealiumTxP4Driver] bsSend is not defined', { remoteLogger: true, type: 'application' });
    });

    it('should call bsSend link function properly when loaded and available', async () => {
      expect.assertions(3);
      tealiumDriver.setup(mockConf);
      await tealiumDriver.trace({ data: { myTraceStructure: 'myTraceData' } });

      expect(mockError).not.toHaveBeenCalled();
      expect(mockBsSend).toHaveBeenCalledTimes(1);
      expect(mockBsSend).toHaveBeenCalledWith('link', {
        myTraceStructure: 'myTraceData',
        pageInfo: {
          isIframe: false
        }
      });
    });

    it('should call bsSend view function properly when loaded and available', async () => {
      expect.assertions(3);
      tealiumDriver.setup(mockConf);
      await tealiumDriver.trace({ data: { myTraceStructure: ['myTraceData'], event: 'view' } });

      expect(mockError).not.toHaveBeenCalled();
      expect(mockBsSend).toHaveBeenCalledTimes(1);
      expect(mockBsSend).toHaveBeenCalledWith('view', {
        event: 'view',
        myTraceStructure: ['myTraceData'],
        pageInfo: {
          isIframe: false
        }
      });
    });

    it('should treat bsSend exceptions accordingly', async () => {
      expect.assertions(3);
      mockBsSend.mockImplementationOnce(() => {
        throw new Error();
      });
      tealiumDriver.setup(mockConf);
      await tealiumDriver.trace({ data: { myTraceStructure: 'myTraceData' } });
      expect(mockBsSend).toHaveBeenCalledTimes(1);
      expect(mockError).toHaveBeenCalledTimes(1);
      expect(mockError).toHaveBeenCalledWith('[TealiumTxP4Driver] [trace] driver error: Error', { remoteLogger: true, type: 'application' });
    });
  });

  describe('traceExperience', () => {
    it('should fail when bsSendExperience not initialized', async () => {
      expect.assertions(2);
      Reflect.set(tealiumDriver, '_isLoaded', Promise.resolve(true));
      await tealiumDriver.traceExperience({ data: { myTraceStructure: 'myTraceData' } });

      expect(mockError).toHaveBeenCalledTimes(1);
      expect(mockError).toHaveBeenCalledWith(
        '[TealiumTxP4Driver] [traceExperience] driver is not properly initialized, bsSendExperience method not initialized',
        {
          remoteLogger: true,
          type: 'application'
        }
      );
    });

    it('should fail when not loaded', async () => {
      expect.assertions(2);
      Reflect.set(tealiumDriver, '_traceInitialized', true);
      await tealiumDriver.traceExperience({ data: { myTraceStructure: 'myTraceData' } });

      expect(mockError).toHaveBeenCalledTimes(1);
      expect(mockError).toHaveBeenCalledWith('[TealiumTxP4Driver] [traceExperience] driver is not properly initialized, scripts not loaded', {
        remoteLogger: true,
        type: 'application'
      });
    });

    it('should fail when bsSendExperience not available', async () => {
      expect.assertions(1);
      tealiumDriver.setup(mockConf);
      delete window.bsSendExperience;
      await tealiumDriver.traceExperience({ data: { myTraceStructure: 'myTraceData' } });

      expect(mockError).toHaveBeenCalledWith('[TealiumTxP4Driver] bsSendExperience is not defined', { remoteLogger: true, type: 'application' });
    });

    it('should call bsSendExperience function properly when loaded and available', async () => {
      expect.assertions(4);
      mockBsSendExperience.mockReturnValueOnce('mockBsSendResponseData');
      tealiumDriver.setup(mockConf);
      const response = await tealiumDriver.traceExperience({ data: { myTraceStructure: 'myTraceData' } });

      expect(mockError).not.toHaveBeenCalled();
      expect(mockBsSendExperience).toHaveBeenCalledTimes(1);
      expect(mockBsSendExperience).toHaveBeenCalledWith({
        myTraceStructure: 'myTraceData',
        pageInfo: {
          isIframe: false
        }
      });
      expect(response).toStrictEqual({ data: 'mockBsSendResponseData' });
    });

    it('should treat bsSendExperience exceptions accordingly', async () => {
      expect.assertions(3);
      mockBsSendExperience.mockImplementationOnce(() => {
        throw new Error();
      });
      tealiumDriver.setup(mockConf);
      await tealiumDriver.traceExperience({ data: { myTraceStructure: 'myTraceData' } });
      expect(mockBsSendExperience).toHaveBeenCalledTimes(1);
      expect(mockError).toHaveBeenCalledTimes(1);
      expect(mockError).toHaveBeenCalledWith('[TealiumTxP4Driver] [traceExperience] driver error: Error', {
        remoteLogger: true,
        type: 'application'
      });
    });
  });

  it('should break non persistant existing datalayer', async () => {
    expect.assertions(1);
    tealiumDriver.setup(mockConf);
    tealiumDriver.updateDataLayer({ nonPersistingData: 'nonPersistingData' });
    tealiumDriver.setBSMAnalyticsData({});

    const dataLayer: Promise<boolean> = Reflect.get(tealiumDriver, '_dataLayer');
    expect(dataLayer).not.toHaveProperty('nonPersistingData');
  });

  it('should flush datalayer', async () => {
    expect.assertions(1);
    tealiumDriver = new TealiumTxP4Driver(mockConf);
    tealiumDriver.setup(mockConf);
    tealiumDriver.updateDataLayer({ nonPersistingData: 'nonPersistingData' });
    tealiumDriver.flushDataLayer();

    expect((tealiumDriver as any)._dataLayer).toStrictEqual({});
  });
});
