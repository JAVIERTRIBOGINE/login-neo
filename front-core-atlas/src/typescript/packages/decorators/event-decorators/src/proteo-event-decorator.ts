import type { ProteoMethodDecorator } from '@proteo/types';
import type { ComponentInterface } from '@stencil/core';
import type { FunctionEventHandler, FunctionEventHandlerAsync } from './types/index.js';

/**
 * Custom decorator to bind functions context on JSXK
 * @returns the decorator itself which the function binding
 *
 *    @ProteoComponentEvent()
 *    myMethod(event: Event | CustomEvent){
 *      this.option;
 *    }
 */
export function ProteoComponentEvent(): ProteoMethodDecorator<FunctionEventHandler, ComponentInterface> {
  return proteoComponentEventDecorator();
}

/**
 * Custom decorator to bind functions context on JSX
 * @returns the decorator itself which the function binding
 *
 *    @ProteoComponentEventAsync()
 *    async myMethod(event: Event | CustomEvent){
 *      await Promise.resolve(this.option);
 *    }
 */
export function ProteoComponentEventAsync(): ProteoMethodDecorator<FunctionEventHandlerAsync, ComponentInterface> {
  return proteoComponentEventDecorator();
}

/**
 * Custom Function decorator to manage the function binding on JSX
 */
function proteoComponentEventDecorator<T extends Function>(): ProteoMethodDecorator<T, ComponentInterface> {
  return (_: ComponentInterface, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) => {
    return {
      configurable: true,
      get(this: T): T {
        const value: T = descriptor?.value?.bind(this);
        Object.defineProperty(this, propertyKey, {
          value,
          configurable: true,
          writable: true
        });

        return value;
      }
    };
  };
}
