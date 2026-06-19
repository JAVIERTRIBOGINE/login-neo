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
 * Custom decorator to destroy the proteo templates functionality
 * @param conf Optional decorator config
 * @returns the decorator itself which removes the component instance extra listeners
 */
function proteoStencilDestroy<T>(conf?: ProteoDestroyOptions): ProteoMethodDecorator<T, ComponentInterface> {
  return (target: ComponentInterface, propertyKey: string | symbol) => {
    LoggerUtils.getInstance().trace('ProteoTemplateDestroy:', target, propertyKey, conf, {
      remoteLogger: true,
      type: 'application'
    });
  };
}

/**
 * Custom decorator to destroy the proteo components functionality
 * @param conf Optional decorator config
 * @returns the decorator itself which removes the component instance extra listeners
 * @example
 *
 *    @ProteoTemplateDestroy(config)
 *    myMethod(){
 *      syncOperation();
 *    }
 */
export function ProteoTemplateDestroy(
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
 *    @ProteoTemplateDestroyAsync(config)
 *    async myMethod(){
 *      await asyncOperation();
 *    }
 */
export function ProteoTemplateDestroyAsync(
  conf?: ProteoDestroyOptions
): ProteoMethodDecorator<ProteoVoidFunctionAsync, ProteoDecoratorTarget> {
  return proteoStencilDestroy(conf);
}
