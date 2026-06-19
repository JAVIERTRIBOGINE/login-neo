import { LoggerUtils } from '@proteo/logger-utils';
import type {
  ProteoDecoratorTarget,
  ProteoMethodDecorator,
  ProteoVoidFunction,
  ProteoVoidFunctionAsync
} from '@proteo/types';
import type { ComponentInterface } from '@stencil/core';
import type { ProteoDestroyOptions } from '../types/index.js';

/**
 * Custom decorator to destroy the proteo components functionality
 * @param conf Optional decorator config
 * @returns the decorator itself which removes the component instance extra listeners
 * @example
 *
 *    @ProteoMoleculeDestroy(config)
 *    myMethod(){
 *      syncOperation();
 *    }
 */
export function ProteoMoleculeDestroy(
  conf?: ProteoDestroyOptions
): ProteoMethodDecorator<ProteoVoidFunction, ProteoDecoratorTarget> {
  return proteoStencilDestroy(conf);
}

/**
 * Custom decorator to destroy the proteo components functionality
 * @param conf Optional decorator config
 * @returns the decorator itself which removes the component instance extra listeners
 * @example
 *
 *    @ProteoMoleculeDestroyAsync(config)
 *    async myMethod(){
 *      await asyncOperation();
 *    }
 */
export function ProteoMoleculeDestroyAsync(
  conf?: ProteoDestroyOptions
): ProteoMethodDecorator<ProteoVoidFunctionAsync, ProteoDecoratorTarget> {
  return proteoStencilDestroy(conf);
}

/**
 * Custom decorator to destroy the proteo molecules functionality
 * @param conf Optional decorator config
 * @returns the decorator itself which removes the component instance extra listeners
 */
function proteoStencilDestroy<T>(conf?: ProteoDestroyOptions): ProteoMethodDecorator<T, ComponentInterface> {
  return (target: ComponentInterface, propertyKey: string | symbol) => {
    LoggerUtils.getInstance().trace('ProteoMoleculeDestroy:', target, propertyKey, conf, {
      remoteLogger: true,
      type: 'application'
    });
  };
}
