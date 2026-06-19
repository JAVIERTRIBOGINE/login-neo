import { LoggerUtils } from '@proteo/logger-utils';
import type {
  ProteoDecoratorTarget,
  ProteoMethodDecorator,
  ProteoVoidFunction,
  ProteoVoidFunctionAsync
} from '@proteo/types';
import type { ComponentInterface } from '@stencil/core';
import type { ProteoTemplateOptions } from '../types/index.js';

/**
 * Custom decorator to extends the proteo templates functionality
 * @param conf Optional decorator config
 * @returns the decorator itself which extends the component instance
 */
function proteoTemplateDecorator<T>(conf?: ProteoTemplateOptions): ProteoMethodDecorator<T, ComponentInterface> {
  return (target: ComponentInterface, propertyKey: string | symbol) => {
    LoggerUtils.getInstance().trace('ProteoTemplate:', target, propertyKey, conf, {
      remoteLogger: true,
      type: 'application'
    });
  };
}

/**
 * Custom decorator to extends the proteo templates functionality when using sync methods
 * @param conf Optional decorator config
 * @returns the decorator itself which extends the component instance
 * @example
 *
 *    @ProteoTemplate(config)
 *    myMethod(){
 *      syncOperation();
 *    }
 */
export function ProteoTemplate(
  conf?: ProteoTemplateOptions
): ProteoMethodDecorator<ProteoVoidFunction, ProteoDecoratorTarget> {
  return proteoTemplateDecorator(conf);
}

/**
 * Custom decorator to extends the proteo templates functionality when using when using async/await method
 * @param conf Optional decorator config
 * @returns the decorator itself which extends the component instance
 * @example
 *
 *    @ProteoTemplateAsync(config)
 *    async myMethod(){
 *      await asyncOperation();
 *    }
 *
 */
export function ProteoTemplateAsync(
  conf?: ProteoTemplateOptions
): ProteoMethodDecorator<ProteoVoidFunctionAsync, ProteoDecoratorTarget> {
  return proteoTemplateDecorator(conf);
}
