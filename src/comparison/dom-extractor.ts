/**
 * DOM extractor — uses Playwright to walk the rendered DOM and
 * extract computed styles + bounding boxes into a DOMNode tree
 * for property-level comparison against the Figma design.
 */

import type { Page } from 'playwright';
import type { DOMNode } from '../types/dom-node.js';

const STYLE_PROPERTIES = [
  'display',
  'flex-direction',
  'justify-content',
  'align-items',
  'gap',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin',
  'width',
  'height',
  'background-color',
  'color',
  'font-size',
  'font-weight',
  'font-family',
  'line-height',
  'letter-spacing',
  'text-align',
  'text-decoration',
  'border-radius',
  'border-width',
  'border-color',
  'box-shadow',
  'opacity',
  'overflow',
];

/**
 * Extract a DOMNode tree from a rendered page at the given CSS selector root.
 *
 * The extraction logic runs inside `page.evaluate()` (browser context).
 * We pass it as a string-based function to avoid TypeScript needing
 * DOM lib types in the Node compilation.
 */
export async function extractDOMTree(
  page: Page,
  rootSelector: string = 'body > *',
  maxDepth: number = 10,
): Promise<DOMNode[]> {
  const result = await page.evaluate(
    `(function() {
      var styles = ${JSON.stringify(STYLE_PROPERTIES)};
      var maxDepth = ${maxDepth};
      var selector = ${JSON.stringify(rootSelector)};

      function walk(el, currentDepth) {
        var computed = window.getComputedStyle(el);
        var rect = el.getBoundingClientRect();

        var styleMap = {};
        for (var i = 0; i < styles.length; i++) {
          styleMap[styles[i]] = computed.getPropertyValue(styles[i]);
        }

        var children = [];
        if (currentDepth < maxDepth) {
          for (var j = 0; j < el.children.length; j++) {
            children.push(walk(el.children[j], currentDepth + 1));
          }
        }

        return {
          selector: buildSelector(el),
          tagName: el.tagName.toLowerCase(),
          computedStyles: styleMap,
          boundingBox: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
          textContent: el.children.length === 0 ? (el.textContent || '').trim() || undefined : undefined,
          children: children
        };
      }

      function buildSelector(el) {
        if (el.id) return '#' + el.id;
        var tag = el.tagName.toLowerCase();
        var cls = Array.from(el.classList).slice(0, 2).map(function(c) { return '.' + c; }).join('');
        var parent = el.parentElement;
        if (!parent) return tag + cls;
        var siblings = Array.from(parent.children).filter(function(s) { return s.tagName === el.tagName; });
        if (siblings.length > 1) {
          var idx = siblings.indexOf(el) + 1;
          return tag + cls + ':nth-child(' + idx + ')';
        }
        return tag + cls;
      }

      var roots = document.querySelectorAll(selector);
      return Array.from(roots).map(function(root) { return walk(root, 0); });
    })()`,
  );

  return result as DOMNode[];
}
