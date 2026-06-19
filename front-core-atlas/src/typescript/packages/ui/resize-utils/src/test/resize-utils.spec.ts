import { describe, expect, it, jest } from '@jest/globals';
import { EventManager } from '@proteo/event-bus';
import { ResizeUtils } from '../resize-utils.js';

window.ResizeObserver = class ResizeObserver {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  observe() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  unobserve() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disconnect() {}
};

describe('resize-observer-utils', () => {
  const instance = ResizeUtils.getInstance();

  it('builds', () => {
    expect.assertions(2);
    const spy = jest.spyOn(ResizeObserver.prototype, 'observe');
    instance.initObserve(document.body);
    expect(instance).toBeTruthy();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should call to publish action when a new size is received', () => {
    expect.assertions(1);
    const spy = jest.spyOn(EventManager.prototype, 'publish') as jest.MockedFunction<typeof EventManager.prototype.publish>;

    // TODO: Pending to find a way to mock the constructor and capture the callback passed to a parameter into ResizeObserver
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const instance = ResizeUtils.getInstance() as any;
    instance.handleEntries([{ target: { clientHeight: 40 } }]);
    expect(spy).toHaveBeenCalledWith('DOM_RESIZE', { data: { height: 72 }, method: 'domResize' });
  });

  it('should call unobserve when the observe event is unnecessary ', () => {
    expect.assertions(1);
    const spy = jest.spyOn(ResizeObserver.prototype, 'unobserve');

    ResizeUtils.getInstance().destroy(document.body);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
