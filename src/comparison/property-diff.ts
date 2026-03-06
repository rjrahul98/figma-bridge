/**
 * Property diff — compares computed CSS properties from the rendered
 * DOM against expected values from the Figma design tree to produce
 * structured mismatch reports.
 */

import type { DesignNode } from '../types/design-node.js';
import type { DOMNode } from '../types/dom-node.js';
import type { Mismatch } from '../types/report.js';

export interface PropertyDiffOptions {
  /** Spacing tolerance in px (default: 2). */
  spacingTolerance?: number;
  /** Color tolerance as Delta-E (default: 5). */
  colorTolerance?: number;
  /** Font-size tolerance in px (default: 0 = exact). */
  fontSizeTolerance?: number;
}

/**
 * Compare a rendered DOMNode against its corresponding DesignNode
 * and return a list of property mismatches.
 */
export function diffProperties(
  designNode: DesignNode,
  domNode: DOMNode,
  options: PropertyDiffOptions = {},
): Mismatch[] {
  const {
    spacingTolerance = 2,
    fontSizeTolerance = 0,
  } = options;

  const mismatches: Mismatch[] = [];

  // ── Dimensions ───────────────────────────────────────────────────────
  if (designNode.size.width.mode === 'fixed') {
    const expected = designNode.size.width.value;
    const actual = domNode.boundingBox.width;
    if (Math.abs(expected - actual) > spacingTolerance) {
      mismatches.push({
        element: designNode.name,
        property: 'width',
        actual: `${actual}px`,
        expected: `${expected}px`,
        severity: Math.abs(expected - actual) > 10 ? 'major' : 'minor',
      });
    }
  }

  if (designNode.size.height.mode === 'fixed') {
    const expected = designNode.size.height.value;
    const actual = domNode.boundingBox.height;
    if (Math.abs(expected - actual) > spacingTolerance) {
      mismatches.push({
        element: designNode.name,
        property: 'height',
        actual: `${actual}px`,
        expected: `${expected}px`,
        severity: Math.abs(expected - actual) > 10 ? 'major' : 'minor',
      });
    }
  }

  // ── Font size ────────────────────────────────────────────────────────
  if (designNode.text) {
    const expectedFontSize = designNode.text.fontSize;
    const actualFontSize = parsePx(domNode.computedStyles['fontSize']);
    if (
      actualFontSize !== null &&
      Math.abs(expectedFontSize - actualFontSize) > fontSizeTolerance
    ) {
      mismatches.push({
        element: designNode.name,
        property: 'font-size',
        actual: `${actualFontSize}px`,
        expected: `${expectedFontSize}px`,
        severity: 'major',
      });
    }

    // Font weight
    const expectedWeight = designNode.text.fontWeight;
    const actualWeight = parseInt(domNode.computedStyles['fontWeight'] ?? '400', 10);
    if (expectedWeight !== actualWeight) {
      mismatches.push({
        element: designNode.name,
        property: 'font-weight',
        actual: String(actualWeight),
        expected: String(expectedWeight),
        severity: 'minor',
      });
    }
  }

  // ── Padding ──────────────────────────────────────────────────────────
  const paddingProps = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const;
  const paddingDesign = designNode.layout.padding;
  const paddingKeys = ['top', 'right', 'bottom', 'left'] as const;

  for (let i = 0; i < 4; i++) {
    const expected = paddingDesign[paddingKeys[i]];
    const actual = parsePx(domNode.computedStyles[paddingProps[i]]);
    if (
      actual !== null &&
      expected > 0 &&
      Math.abs(expected - actual) > spacingTolerance
    ) {
      mismatches.push({
        element: designNode.name,
        property: `padding-${paddingKeys[i]}`,
        actual: `${actual}px`,
        expected: `${expected}px`,
        severity: 'minor',
      });
    }
  }

  // ── Gap ──────────────────────────────────────────────────────────────
  if (designNode.layout.gap > 0) {
    const actualGap = parsePx(domNode.computedStyles['gap']);
    if (
      actualGap !== null &&
      Math.abs(designNode.layout.gap - actualGap) > spacingTolerance
    ) {
      mismatches.push({
        element: designNode.name,
        property: 'gap',
        actual: `${actualGap}px`,
        expected: `${designNode.layout.gap}px`,
        severity: 'minor',
      });
    }
  }

  // ── Border radius ──────────────────────────────────────────────────
  const { borderRadius } = designNode.styles;
  const uniform =
    borderRadius.tl === borderRadius.tr &&
    borderRadius.tr === borderRadius.br &&
    borderRadius.br === borderRadius.bl;

  if (uniform && borderRadius.tl > 0) {
    const actualRadius = parsePx(domNode.computedStyles['borderRadius']);
    if (
      actualRadius !== null &&
      Math.abs(borderRadius.tl - actualRadius) > 1
    ) {
      mismatches.push({
        element: designNode.name,
        property: 'border-radius',
        actual: `${actualRadius}px`,
        expected: `${borderRadius.tl}px`,
        severity: 'minor',
      });
    }
  }

  return mismatches;
}

function parsePx(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/^([\d.]+)px$/);
  return match ? parseFloat(match[1]) : null;
}
