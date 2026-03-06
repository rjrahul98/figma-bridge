/**
 * Node matcher — attempts to pair DesignNode entries with their
 * corresponding DOMNode entries so the property diff can compare
 * the right elements against each other.
 *
 * Matching heuristics (in priority order):
 *   1. Text content match
 *   2. Structural position (nth child at same depth)
 *   3. Tag role similarity (text node → p/span, frame → div/section)
 */

import type { DesignNode } from '../types/design-node.js';
import type { DOMNode } from '../types/dom-node.js';

export interface MatchedPair {
  design: DesignNode;
  dom: DOMNode;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Match design nodes against DOM nodes, returning paired entries.
 */
export function matchNodes(
  designNodes: DesignNode[],
  domNodes: DOMNode[],
): MatchedPair[] {
  const pairs: MatchedPair[] = [];
  const usedDom = new Set<number>();

  for (const designNode of designNodes) {
    let bestIndex = -1;
    let bestConfidence: 'high' | 'medium' | 'low' = 'low';

    for (let i = 0; i < domNodes.length; i++) {
      if (usedDom.has(i)) continue;
      const domNode = domNodes[i];

      // High confidence: text content match
      if (
        designNode.text?.content &&
        domNode.textContent &&
        domNode.textContent.includes(designNode.text.content.slice(0, 30))
      ) {
        bestIndex = i;
        bestConfidence = 'high';
        break;
      }

      // Medium confidence: tag role similarity
      if (isRoleMatch(designNode, domNode) && bestConfidence === 'low') {
        bestIndex = i;
        bestConfidence = 'medium';
      }
    }

    if (bestIndex >= 0) {
      usedDom.add(bestIndex);
      pairs.push({
        design: designNode,
        dom: domNodes[bestIndex],
        confidence: bestConfidence,
      });
    }

    // Recurse into children.
    if (designNode.children.length > 0 && bestIndex >= 0) {
      const childPairs = matchNodes(
        designNode.children,
        domNodes[bestIndex].children,
      );
      pairs.push(...childPairs);
    }
  }

  return pairs;
}

function isRoleMatch(design: DesignNode, dom: DOMNode): boolean {
  const textTags = new Set(['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'label']);
  const containerTags = new Set(['div', 'section', 'main', 'nav', 'header', 'footer', 'article', 'aside']);

  if (design.type === 'text' && textTags.has(dom.tagName)) return true;
  if (design.type === 'frame' && containerTags.has(dom.tagName)) return true;
  if (design.type === 'image' && dom.tagName === 'img') return true;

  return false;
}
