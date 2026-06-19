import type { DataManagerConfiguration } from './data-manager.js';
import type { LanguageConfiguration } from './i18n-utils.js';
// TODO: Remove when the interfaces have values
/* eslint-disable @typescript-eslint/no-empty-interface */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export declare type ProteoDecoratorTarget = { [memberName: string]: unknown };

/**
 * Type for a proteo custom component method decorator for every kind of target
 */
export declare type ProteoMethodDecorator<T, K extends ProteoDecoratorTarget> = (
  target: K,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>
) => TypedPropertyDescriptor<T> | void;

/**
 * Type for a proteo custom component property decorator for every kind of target
 */
export declare type ProteoPropertyDecorator<K extends ProteoDecoratorTarget> = (
  target: K,
  propertyKey: string | symbol
) => void;

/**
 * Type for a proteo custom component method parameter decorator
 */
export declare type ProteoParameterDecorator<K extends ProteoDecoratorTarget> = (
  target: K,
  propertyKey: string | symbol,
  index: number
) => void;

/**
 * Interface for a proteo utils decorator input parameter
 */
export declare interface ProteoUtilsOptions {
  language?: LanguageConfiguration;
  dataManager?: DataManagerConfiguration;
}

/**
 * Type for an function without params and no return
 */
export declare type ProteoVoidFunction = () => void;

/**
 * Type for an function without params and no return in an Async way as Promise
 */
export declare type ProteoVoidFunctionAsync = () => Promise<void>;

/**
 * Available modes for proteo4 StencilJS components
 */
export type AvailableProteoModes = 'ios' | 'android' | 'web';

/**
 * Base options for methods
 */
export declare interface BaseOptions {
  ignoreLogs?: boolean;
}

export enum EnumEnvironments {
  PRE = 'PRE',
  INT = 'INT',
  PRO = 'PRO'
}

export const BS_HOST = {
  [EnumEnvironments.INT]: 'https://acc.bancsabadell.com',
  [EnumEnvironments.PRE]: 'https://uat.bancsabadell.com',
  [EnumEnvironments.PRO]: 'https://www.bancsabadell.com'
};
