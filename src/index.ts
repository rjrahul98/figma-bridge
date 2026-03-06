/**
 * figma-bridge — public API surface.
 *
 * Re-exports types, the Figma client, URL parser, and config loader
 * for programmatic usage.
 */

// Types
export * from './types/index.js';

// Figma
export { FigmaClient, parseFigmaURL, extractFileId } from './figma/index.js';
export type {
  FigmaClientOptions,
  GetFileOptions,
  ExportImageOptions,
  ParsedFigmaURL,
} from './figma/index.js';

// Config
export { loadConfig, tryLoadConfig } from './config/index.js';

// Utils
export { logger } from './utils/logger.js';
export type { LogLevel } from './utils/logger.js';
