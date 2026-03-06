/**
 * Feedback builder — constructs IterationFeedback by comparing
 * the rendered component against the Figma design tree.
 *
 * In Phase 2 we use a simplified heuristic scorer (no Playwright
 * rendering yet). Phase 3 will add the full visual diff pipeline.
 */

import type { DesignNode } from '../types/design-node.js';
import type { IterationFeedback, Mismatch } from '../types/report.js';

/**
 * Build a basic feedback report by statically analyzing the
 * generated TSX against the design tree.
 *
 * This is a heuristic fallback — the real comparison engine
 * (Phase 3) will render the component and do pixel + property diffs.
 */
export function buildStaticFeedback(
  tsx: string,
  designTree: DesignNode,
): IterationFeedback {
  const mismatches: Mismatch[] = [];
  const missingElements: string[] = [];

  // Check text content is present.
  walkTree(designTree, (node) => {
    if (node.text?.content) {
      const textSnippet = node.text.content.slice(0, 40);
      if (!tsx.includes(textSnippet)) {
        missingElements.push(
          `Text "${textSnippet}${node.text.content.length > 40 ? '...' : ''}" (node: ${node.name})`,
        );
      }
    }
  });

  // Check component instances are referenced.
  walkTree(designTree, (node) => {
    if (node.componentInstance) {
      const compName = node.componentInstance.componentName;
      // Look for either the component tag or an import.
      if (!tsx.includes(compName) && !tsx.includes(`<${compName}`)) {
        mismatches.push({
          element: node.name,
          property: 'component',
          actual: 'missing',
          expected: compName,
          severity: 'major',
          suggestedFix: `Import and use <${compName} />`,
        });
      }
    }
  });

  // Estimate a score based on issues found.
  const issueCount = mismatches.length + missingElements.length;
  const score = Math.max(0, 100 - issueCount * 10);

  return {
    overallScore: score,
    mismatches,
    missingElements,
    extraElements: [],
  };
}

function walkTree(
  node: DesignNode,
  visitor: (node: DesignNode) => void,
): void {
  visitor(node);
  for (const child of node.children) {
    walkTree(child, visitor);
  }
}
