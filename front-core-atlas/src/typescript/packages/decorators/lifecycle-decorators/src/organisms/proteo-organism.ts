import { LoggerUtils } from '@proteo/logger-utils';
import type {
  ProteoDecoratorTarget,
  ProteoMethodDecorator,
  ProteoVoidFunction,
  ProteoVoidFunctionAsync
} from '@proteo/types';
import type { ComponentInterface } from '@stencil/core';
import type { ProteoOrganismOptions } from '../types/index.js';

/**
 * Custom decorator to extends the proteo organisms functionality
 * @param conf Optional decorator config
 * @returns the decorator itself which extends the component instance
 */
function proteoOrganismDecorator<T>(conf?: ProteoOrganismOptions): ProteoMethodDecorator<T, ComponentInterface> {
  return (target: ComponentInterface, propertyKey: string | symbol) => {
    LoggerUtils.getInstance().trace('ProteoOrganism:', target, propertyKey, conf, {
      remoteLogger: true,
      type: 'application'
    });
  };
}

/**
 * Custom decorator to extends the proteo organisms functionality when using sync methods
 * @param conf Optional decorator config
 * @returns the decorator itself which extends the component instance
 * @example
 *
 *    @ProteoOrganism(config)
 *    myMethod(){
 *      syncOperation();
 *    }
 */
export function ProteoOrganism(
  conf?: ProteoOrganismOptions
): ProteoMethodDecorator<ProteoVoidFunction, ProteoDecoratorTarget> {
  return proteoOrganismDecorator(conf);
}

/**
 * Custom decorator to extends the proteo organisms functionality when using when using async/await method
 * @param conf Optional decorator config
 * @returns the decorator itself which extends the component instance
 * @example
 *
 *    @ProteoOrganismAsync(config)
 *    async myMethod(){
 *      await asyncOperation();
 *    }
 *
 */
export function ProteoOrganismAsync(
  conf?: ProteoOrganismOptions
): ProteoMethodDecorator<ProteoVoidFunctionAsync, ProteoDecoratorTarget> {
  return proteoOrganismDecorator(conf);
}
