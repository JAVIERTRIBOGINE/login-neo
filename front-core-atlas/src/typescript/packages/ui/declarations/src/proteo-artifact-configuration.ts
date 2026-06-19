import type { ProteoLoggerConfig } from '@proteo/types';

/**
 * Enumerate for typing different proteo projects
 */
export enum ProteoProjectTypes {
  CORE,
  CORE_DESIGN,
  CORE_ATOM,
  CORE_MOLECULE,
  CORE_ORGANISM,
  TEMPLATE_ANGULAR,
  TEMPLATE_STENCIL,
  APP
}

/**
 * Model for typing proteo configuration in proteo.config.json
 */
export interface ProteoConfig {
  name: string;
  type: ProteoProjectTypes;
  logger: ProteoLoggerConfig;
}
