import { LoggerUtils } from '@proteo/logger-utils';
import type {
  ProteoDecoratorTarget,
  ProteoMethodDecorator,
  ProteoVoidFunction,
  ProteoVoidFunctionAsync
} from '@proteo/types';
import type { ComponentInterface } from '@stencil/core';
import type { ProteoMoleculeOptions } from '../types/index.js';

/**
 * Custom decorator to extends the proteo molecules functionality
 * @param conf Optional decorator config
 * @returns the decorator itself which extends the component instance
 */
function proteoMoleculeDecorator<T>(conf?: ProteoMoleculeOptions): ProteoMethodDecorator<T, ComponentInterface> {
  return (target: ComponentInterface, propertyKey: string | symbol) => {
    LoggerUtils.getInstance().trace('ProteoMolecule:', target, propertyKey, conf, {
      remoteLogger: true,
      type: 'application'
    });
  };
}

/**
 * Custom decorator to extends the proteo molecules functionality when using sync methods
 * @param conf Optional decorator config
 * @returns the decorator itself which extends the component instance
 * @example
 *
 *    @ProteoMolecule(config)
 *    myMethod(){
 *      syncOperation();
 *    }
 */
export function ProteoMolecule(
  conf?: ProteoMoleculeOptions
): ProteoMethodDecorator<ProteoVoidFunction, ProteoDecoratorTarget> {
  return proteoMoleculeDecorator(conf);
}

/**
 * Custom decorator to extends the proteo molecules functionality when using when using async/await method
 * @param conf Optional decorator config
 * @returns the decorator itself which extends the component instance
 * @example
 *
 *    @ProteoMoleculeAsync(config)
 *    async myMethod(){
 *      await asyncOperation();
 *    }
 *
 */
export function ProteoMoleculeAsync(
  conf?: ProteoMoleculeOptions
): ProteoMethodDecorator<ProteoVoidFunctionAsync, ProteoDecoratorTarget> {
  return proteoMoleculeDecorator(conf);
}
