export { renderComponent, renderPage, closeBrowser } from './renderer.js';
export type { RenderResult, RendererOptions } from './renderer.js';

export { compareImages } from './visual-diff.js';
export type { VisualDiffResult } from './visual-diff.js';

export { extractDOMTree } from './dom-extractor.js';

export { diffProperties } from './property-diff.js';
export type { PropertyDiffOptions } from './property-diff.js';

export { matchNodes } from './matcher.js';
export type { MatchedPair } from './matcher.js';
