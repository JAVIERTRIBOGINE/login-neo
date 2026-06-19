import { describe, expect, it, jest } from '@jest/globals';
import { ProteoComponentEvent, ProteoComponentEventAsync } from '../proteo-event-decorator.js';

describe('Proteo component event decorator', () => {
  it('when it is created, should return the decorator function', () => {
    expect(ProteoComponentEvent()).toBeInstanceOf(Function);
    expect(ProteoComponentEventAsync()).toBeInstanceOf(Function);
  });

  it('when the decorator is used on a function, the function does not lose the this context', () => {
    class TestClass {
      public map = {
        test: this.testFunction,
        testEvent: this.testEventFunction
      };
      private option = 'test';

      public debug: (message: string) => void = (message) => {
        // eslint-disable-next-line no-console
        console.log(message);
      };

      @ProteoComponentEvent()
      private testFunction() {
        this.debug(this.option);
      }

      @ProteoComponentEvent()
      private testEventFunction(e: Event | undefined) {
        this.debug(e?.cancelable + ' ' + this.option);
      }
    }
    expect.assertions(2);
    const myClass = new TestClass();
    const spy = jest.fn();
    myClass.debug = spy;
    myClass.map.test();
    expect(spy).toHaveBeenCalledWith('test');
    spy.mockClear();
    myClass.map.testEvent(new Event('click'));
    expect(spy).toHaveBeenCalledWith('false test');
  });
});
