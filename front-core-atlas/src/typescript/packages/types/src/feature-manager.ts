/**
 * Interface for the Feature Manager.
 */
export interface IFeatureManager {
  /**
   * Registers a new feature manager with the given name and key.
   * @param name - The name of the feature manager.
   * @param key - The key for the feature manager.
   * @returns A promise that resolves when the registration is complete.
   */
  register(name: string, key: string): Promise<void>;

  /**
   * Uses the feature manager with the given name.
   * @param name - The name of the feature manager.
   * @returns A promise that resolves when the feature manager is ready to use.
   */
  use(name: string): Promise<void>;

  /**
   * Gets the value of a feature flag.
   * @param name - The name of the feature flag.
   * @param opts - The options for the feature flag.
   * @returns The value of the feature flag in string.
   */
  value(name: string, opts: FeatureManagerFlag): string;
}

/**
 * Interface for the options of a feature flag.
 */
export interface FeatureManagerFlag {
  /**
   * The default value of the feature flag.
   */
  defaultValue?: string;

  /**
   * The context for the feature flag.
   */
  context?: FeatureManagerContext;
}

/**
 * Enum for the types of feature flags.
 */
export enum FeatureManagerTypes {
  Number = 'number',
  String = 'string',
  Flag = 'boolean'
}

/**
 * Interface for the context of a feature flag.
 */
export interface FeatureManagerContext {
  [key: string]: string;
}
