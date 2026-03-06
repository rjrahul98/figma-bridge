export { parseTailwindConfig } from './tailwind-parser.js';
export type { TailwindTheme } from './tailwind-parser.js';

export {
  buildTokenResolver,
  resolveColor,
  resolveSpacing,
  resolveFontSize,
  resolveRadius,
} from './token-resolver.js';

export {
  scanComponents,
  loadCachedIndex,
  saveCachedIndex,
} from './component-indexer.js';
export type { ScanOptions } from './component-indexer.js';

export { extractStyleExamples } from './style-examples.js';
export type { StyleExample } from './style-examples.js';
