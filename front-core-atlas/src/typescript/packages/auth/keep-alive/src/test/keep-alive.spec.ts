import { describe, expect, it, jest } from '@jest/globals';
import { EventManager } from '@proteo/event-bus';
import { KeepAlive } from '../keep-alive.js';

jest.useFakeTimers();

describe('Keep Alive', () => {
  KeepAlive.initInstance();
  const keepAliveEntity: KeepAlive = KeepAlive.getInstance();

  beforeEach(() => {
    jest.spyOn(EventManager.prototype, 'publish') as jest.MockedFunction<typeof EventManager.prototype.publish>;
  });

  it('Should exist the BsKeepAliveUtils property in the window', () => {
    expect(window.BsKeepAliveUtils).toBeDefined;
  });

  it('should execute the Keep Alive function and check the published KEEP-ALIVE event', () => {
    keepAliveEntity.keepAlive();
    expect(EventManager.prototype.publish).toHaveBeenCalledTimes(1);
    expect(EventManager.prototype.publish).toHaveBeenCalledWith('KEEP_ALIVE', { method: 'keepAlive' });
  });

  it('should execute the KEEP-ALIVE event publish just once even though the keep alive function has been called twice', () => {
    jest.runAllTimers();
    keepAliveEntity.keepAlive();
    keepAliveEntity.keepAlive();
    expect(EventManager.prototype.publish).toHaveBeenCalledTimes(1);
  });

  it('should execute the KEEP-ALIVE event publish just once even though the keep alive function has been called twice in a short lapse of time', () => {
    jest.runAllTimers();
    keepAliveEntity.keepAlive();
    jest.advanceTimersByTime(10);
    keepAliveEntity.keepAlive();
    expect(EventManager.prototype.publish).toHaveBeenCalledTimes(1);
  });

  it('should execute the KEEP-ALIVE event publish twice because the keep alive function has been called twice in a long lapse of time (bigger than the value setted)', () => {
    jest.runAllTimers();
    keepAliveEntity.keepAlive();
    jest.runAllTimers();
    keepAliveEntity.keepAlive();
    expect(EventManager.prototype.publish).toHaveBeenCalledTimes(2);
  });
});
