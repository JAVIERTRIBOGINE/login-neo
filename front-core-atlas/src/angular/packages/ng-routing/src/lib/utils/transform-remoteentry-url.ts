import { LoggerUtils } from '@proteo/logger-utils';

/**
 * Transforms a remote entry URL by updating its version according to the specified version format.
 * Supports both semantic versioning (e.g., "2.0.0") and major versioning (e.g., "3").
 *
 * @param remoteEntry - The original remote entry URL to transform
 * @param version - The target version (semantic like "2.0.0" or major like "3")
 * @param appId - The application identifier
 * @returns The transformed remote entry URL or the original URL if transformation fails
 */
export function changeRemoteEntry(remoteEntry: string, version: string, appId: string): string {
  try {
    if (!isValidVersionFormat(version)) {
      LoggerUtils.getInstance().error(`❌ [DynamicRouting - Pilotaje] ${appId} invalid version format: ${version}`);
      return remoteEntry;
    }

    const urlType = detectUrlFormat(remoteEntry);

    if (!urlType) {
      LoggerUtils.getInstance().error(`❌ [DynamicRouting - Pilotaje] ${appId} URL format not recognized for piloting: ${remoteEntry}`);
      return remoteEntry;
    }

    return transformUrl(remoteEntry, version, urlType);
  } catch (error) {
    LoggerUtils.getInstance().error(`❌ [DynamicRouting - Pilotaje] ${appId} error processing remoteEntry: ${error}`);
    return remoteEntry;
  }
}

/**
 * Validates if the provided version string follows a supported format.
 * Supports semantic versioning (X.Y.Z with optional -SNAPSHOT) and major versioning (single number).
 *
 * @param version - The version string to validate
 * @returns True if the version format is valid, false otherwise
 */
export function isValidVersionFormat(version: string): boolean {
  const isSemanticVersion = /^\d+\.\d+\.\d+(-SNAPSHOT)?$/.test(version);
  const isMajorVersion = /^\d+$/.test(version);
  return isSemanticVersion || isMajorVersion;
}

/**
 * Determines if a version string follows semantic versioning format.
 * Semantic versions are in the format X.Y.Z with optional -SNAPSHOT suffix.
 *
 * @param version - The version string to check
 * @returns True if the version is semantic, false otherwise
 */
export function isSemanticVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+(-SNAPSHOT)?$/.test(version);
}

/**
 * Detects the URL format type of a remote entry URL.
 * Identifies whether the URL follows semantic or major versioning pattern.
 *
 * @param remoteEntry - The remote entry URL to analyze
 * @returns 'semantic' for semantic versioning URLs, 'major' for major versioning URLs, or null if unrecognized
 */
export function detectUrlFormat(remoteEntry: string): 'semantic' | 'major' | null {
  const semanticRegex = /\/v(\d+)\/\w*\/(\d+\.\d+\.\d+(-SNAPSHOT)?)\/remoteEntry\.js$/;
  const majorRegex = /\/v(\d+)\/remoteEntry\.js$/;

  if (semanticRegex.test(remoteEntry)) return 'semantic';
  if (majorRegex.test(remoteEntry)) return 'major';
  return null;
}

/**
 * Transforms a remote entry URL to match the target version format.
 *
 * @param remoteEntry - The original remote entry URL
 * @param version - The target version string
 * @param urlType - The current URL format type ('semantic' or 'major')
 * @returns The transformed URL with the new version
 */
export function transformUrl(remoteEntry: string, version: string, urlType: 'semantic' | 'major'): string {
  const basePath = extractBasePath(remoteEntry, urlType);
  const isSemanticVer = isSemanticVersion(version);

  if (isSemanticVer) {
    return buildSemanticUrl(basePath, version);
  } else {
    return buildMajorUrl(basePath, version);
  }
}

/**
 * Extracts the base path from a remote entry URL by removing version-specific segments.
 * The base path includes everything up to but not including the version directory.
 *
 * @param remoteEntry - The complete remote entry URL
 * @param urlType - The URL format type to determine which regex pattern to use
 * @returns The base path without version-specific segments
 *
 * @example
 * ```typescript
 * extractBasePath(
 *   "https://example.com/app/v1/versions/1.0.0/remoteEntry.js",
 *   "semantic"
 * );
 * // Returns: "https://example.com/app"
 *
 * extractBasePath(
 *   "https://example.com/app/v1/remoteEntry.js",
 *   "major"
 * );
 * // Returns: "https://example.com/app"
 * ```
 */
export function extractBasePath(remoteEntry: string, urlType: 'semantic' | 'major'): string {
  const semanticRegex = /\/v(\d+)\/\w*\/(\d+\.\d+\.\d+(-SNAPSHOT)?)\/remoteEntry\.js$/;
  const majorRegex = /\/v(\d+)\/remoteEntry\.js$/;

  return urlType === 'semantic' ? remoteEntry.replace(semanticRegex, '') : remoteEntry.replace(majorRegex, '');
}

/**
 * Builds a semantic versioning URL with the format: /vX/versions/X.Y.Z/remoteEntry.js
 * Extracts the major version from the semantic version to construct the path.
 *
 * @param basePath - The base URL path without version segments
 * @param version - The semantic version string (e.g., "2.0.0", "1.5.3-SNAPSHOT")
 * @returns The complete semantic versioning URL
 *
 * @example
 * ```typescript
 * buildSemanticUrl("https://example.com/app", "2.0.0");
 * // Returns: "https://example.com/app/v2/versions/2.0.0/remoteEntry.js"
 *
 * buildSemanticUrl("https://example.com/app", "1.5.3-SNAPSHOT");
 * // Returns: "https://example.com/app/v1/versions/1.5.3-SNAPSHOT/remoteEntry.js"
 * ```
 */
export function buildSemanticUrl(basePath: string, version: string): string {
  const majorVersion = version.split('.')[0];
  return `${basePath}/v${majorVersion}/versions/${version}/remoteEntry.js`;
}

/**
 * Builds a major versioning URL with the format: /vX/remoteEntry.js
 * Uses the version directly as the major version number.
 *
 * @param basePath - The base URL path without version segments
 * @param version - The major version string (e.g., "3", "1")
 * @returns The complete major versioning URL
 *
 * @example
 * ```typescript
 * buildMajorUrl("https://example.com/app", "3");
 * // Returns: "https://example.com/app/v3/remoteEntry.js"
 *
 * buildMajorUrl("https://example.com/app", "1");
 * // Returns: "https://example.com/app/v1/remoteEntry.js"
 * ```
 */
export function buildMajorUrl(basePath: string, version: string): string {
  return `${basePath}/v${version}/remoteEntry.js`;
}
