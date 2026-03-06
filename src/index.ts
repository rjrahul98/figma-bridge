/**
 * figma-bridge — public API surface.
 *
 * Re-exports types, clients, and utilities for programmatic usage.
 */

// Types
export * from './types/index.js';

// Figma
export {
  FigmaClient,
  parseFigmaURL,
  extractFileId,
  normalizeNode,
  findNodeById,
  exportReferenceImage,
  bufferToBase64,
} from './figma/index.js';
export type {
  FigmaClientOptions,
  GetFileOptions,
  ExportImageOptions,
  ExportReferenceOptions,
  ParsedFigmaURL,
} from './figma/index.js';

// Config
export { loadConfig, tryLoadConfig } from './config/index.js';

// Context
export {
  parseTailwindConfig,
  buildTokenResolver,
  resolveColor,
  resolveSpacing,
  resolveFontSize,
  resolveRadius,
  scanComponents,
  loadCachedIndex,
  saveCachedIndex,
  extractStyleExamples,
} from './context/index.js';
export type { TailwindTheme, ScanOptions, StyleExample } from './context/index.js';

// Agent
export { ClaudeClient, runAgentLoop, extractTSX, extractComponentName } from './agent/index.js';
export type { AgentLoopOptions, AgentLoopResult } from './agent/index.js';

// Comparison
export {
  renderComponent,
  renderPage,
  closeBrowser,
  compareImages,
  extractDOMTree,
  diffProperties,
  matchNodes,
} from './comparison/index.js';
export type {
  RenderResult,
  RendererOptions,
  VisualDiffResult,
  PropertyDiffOptions,
  MatchedPair,
} from './comparison/index.js';

// Utils
export { logger } from './utils/logger.js';
export type { LogLevel } from './utils/logger.js';
export { figmaColorToHex, figmaColorToRgba, hexToRgb, normalizeHex } from './utils/color.js';
export { formatCode } from './utils/prettier.js';
