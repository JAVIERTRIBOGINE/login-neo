import { describe, expect, it, jest } from '@jest/globals';
import { EventManager } from '@proteo/event-bus';
import { requestBiometric } from '../biometric-utils.js';

describe('biometric-utils', () => {
  beforeEach(() => {
    EventManager.getInstance().publishWithResponse = jest.fn() as jest.MockedFunction<typeof EventManager.getInstance.prototype.publishWithResponse>;
  });

  it('When the requestBiometric function is called, the event manager should emit an event', () => {
    requestBiometric();
    expect(EventManager.getInstance().publishWithResponse).toHaveBeenCalledWith('REQUEST_BIOMETRIC', {
      method: 'requestBiometric'
    });
  });
});
