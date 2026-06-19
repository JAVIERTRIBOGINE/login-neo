import { LoggerUtils } from '@proteo/logger-utils';
import type {
  ProteoDecoratorTarget,
  ProteoMethodDecorator,
  ProteoVoidFunction,
  ProteoVoidFunctionAsync
} from '@proteo/types';
import type { ComponentInterface } from '@stencil/core';
import type { ProteoElementOptions } from './types/index.js';

/**
 * Custom decorator to extends the proteo components functionality
 * @param conf Optional decorator config
 * @returns the decorator itself which extends the component instance
 */
function proteoElementDecorator<T>(conf?: ProteoElementOptions): ProteoMethodDecorator<T, ComponentInterface> {
  return (target: ComponentInterface, propertyKey: string | symbol) => {
    LoggerUtils.getInstance().trace('ProteoElement:', target, propertyKey, conf, {
      remoteLogger: true,
      type: 'application'
    });
  };
}

/**
 * Custom decorator to extends the proteo components functionality when using sync methods
 * @param conf Optional decorator config
 * @returns the decorator itself which extends the component instance
 * @example
 *
 *    @ProteoElement(config)
 *    myMethod(){
 *      syncOperation();
 *    }
 *
 */
export function ProteoElement(
  conf?: ProteoElementOptions
): ProteoMethodDecorator<ProteoVoidFunction, ProteoDecoratorTarget> {
  return proteoElementDecorator(conf);
}

/**
 * Custom decorator to extends the proteo components functionality when using async/await method
 * @param conf Optional decorator config
 * @returns the decorator itself which extends the component instance
 * @example
 *
 *    @ProteoElementAsync(config)
 *    async myMethod(){
 *      await asyncOperation();
 *    }
 *
 */
export function ProteoElementAsync(
  conf?: ProteoElementOptions
): ProteoMethodDecorator<ProteoVoidFunctionAsync, ProteoDecoratorTarget> {
  return proteoElementDecorator(conf);
}
