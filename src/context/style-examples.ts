/**
 * Style examples extractor — picks representative code snippets
 * from the scanned component library so Claude can see the project's
 * existing patterns (naming conventions, className usage, etc.).
 */

import type { ComponentIndex } from '../types/component-index.js';

const MAX_EXAMPLES = 5;
const MAX_LINES = 60;

export interface StyleExample {
  name: string;
  importPath: string;
  snippet: string;
}

/**
 * Select a handful of representative component examples from the index.
 * Prioritises components that use Tailwind classes and have props.
 */
export function extractStyleExamples(
  index: ComponentIndex,
): StyleExample[] {
  // Score each component by relevance.
  const scored = index
    .map((entry) => ({
      entry,
      score: scoreComponent(entry.sourceCode),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_EXAMPLES);

  return scored.map(({ entry }) => ({
    name: entry.name,
    importPath: entry.importPath,
    snippet: truncateSource(entry.sourceCode, MAX_LINES),
  }));
}

function scoreComponent(source: string): number {
  let score = 0;
  if (source.includes('className')) score += 3;
  if (source.includes('tailwind') || /\bclass[Nn]ame=.*"[^"]*\b(flex|grid|bg-|text-|p-|m-)/.test(source)) score += 2;
  if (source.includes('props') || source.includes('Props')) score += 1;
  if (source.includes('children')) score += 1;
  if (source.includes('variant') || source.includes('Variant')) score += 1;
  // Penalise very short or very long files.
  const lines = source.split('\n').length;
  if (lines < 10) score -= 2;
  if (lines > 200) score -= 1;
  return score;
}

function truncateSource(source: string, maxLines: number): string {
  const lines = source.split('\n');
  if (lines.length <= maxLines) return source;
  return lines.slice(0, maxLines).join('\n') + '\n// ... (truncated)';
}
