import { LoggerUtils } from '@proteo/logger-utils';
import type {
  ProteoDecoratorTarget,
  ProteoMethodDecorator,
  ProteoVoidFunction,
  ProteoVoidFunctionAsync
} from '@proteo/types';
import type { ComponentInterface } from '@stencil/core';
import type { ProteoAtomOptions } from '../types/index.js';

/**
 * Custom decorator to extend the proteo atoms functionality
 * @param conf Optional decorator config
 * @returns the decorator itself which extends the component instance
 */
function proteoAtomDecorator<T>(conf?: ProteoAtomOptions): ProteoMethodDecorator<T, ComponentInterface> {
  return (target: ComponentInterface, propertyKey: string | symbol) => {
    LoggerUtils.getInstance().trace('ProteoAtom:', target, propertyKey, conf, {
      remoteLogger: true,
      type: 'application'
    });
  };
}

/**
 * Custom decorator to extend the proteo atoms functionality when using sync methods
 * @param conf Optional decorator config
 * @returns the decorator itself which extends the component instance
 * @example
 *
 *    @ProteoAtom(config)
 *    myMethod(){
 *      syncOperation();
 *    }
 */
export function ProteoAtom(conf?: ProteoAtomOptions): ProteoMethodDecorator<ProteoVoidFunction, ProteoDecoratorTarget> {
  return proteoAtomDecorator(conf);
}

/**
 * Custom decorator to extend the proteo atoms functionality when using async/await method
 * @param conf Optional decorator config
 * @returns the decorator itself which extends the component instance
 * @example
 *
 *    @ProteoAtomAsync(config)
 *    async myMethod(){
 *      await asyncOperation();
 *    }
 *
 */
export function ProteoAtomAsync(
  conf?: ProteoAtomOptions
): ProteoMethodDecorator<ProteoVoidFunctionAsync, ProteoDecoratorTarget> {
  return proteoAtomDecorator(conf);
}
