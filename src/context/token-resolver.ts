/**
 * Token resolver — maps raw Figma design values (px, hex colors)
 * to their nearest Tailwind utility class using the parsed theme.
 */

import type { TokenResolver, TokenResolution } from '../types/tokens.js';
import type { TailwindTheme } from './tailwind-parser.js';
import { normalizeHex, hexToRgb } from '../utils/color.js';

// ─── Build resolver ──────────────────────────────────────────────────────────

/**
 * Build a TokenResolver from a parsed TailwindTheme.
 * Each map stores `value → tailwind-class-name`.
 */
export function buildTokenResolver(theme: TailwindTheme): TokenResolver {
  return {
    colorMap: buildColorMap(theme.colors),
    spacingMap: buildSpacingMap(theme.spacing),
    fontSizeMap: buildFontSizeMap(theme.fontSize),
    radiusMap: buildRadiusMap(theme.borderRadius),
    shadowMap: buildShadowMap(theme.boxShadow),
  };
}

// ─── Resolution helpers ──────────────────────────────────────────────────────

/**
 * Resolve a hex color to the nearest Tailwind color class.
 */
export function resolveColor(
  resolver: TokenResolver,
  hex: string,
  prefix: 'bg' | 'text' | 'border' = 'bg',
): TokenResolution {
  const normalized = normalizeHex(hex);
  const exact = resolver.colorMap.get(normalized);

  if (exact) {
    return {
      original: hex,
      resolved: `${prefix}-${exact}`,
      exact: true,
    };
  }

  // Find nearest by Euclidean RGB distance.
  const target = hexToRgb(normalized);
  if (!target) {
    return { original: hex, resolved: `[${hex}]`, exact: false };
  }

  let bestKey = '';
  let bestDist = Infinity;

  for (const [colorHex, className] of resolver.colorMap) {
    const candidate = hexToRgb(colorHex);
    if (!candidate) continue;
    const dist = Math.sqrt(
      (target.r - candidate.r) ** 2 +
        (target.g - candidate.g) ** 2 +
        (target.b - candidate.b) ** 2,
    );
    if (dist < bestDist) {
      bestDist = dist;
      bestKey = className;
    }
  }

  // Only accept if within Delta-E ≈ 15 (rough perceptual threshold).
  if (bestDist < 40 && bestKey) {
    return {
      original: hex,
      resolved: `${prefix}-${bestKey}`,
      exact: false,
      distance: bestDist,
    };
  }

  return {
    original: hex,
    resolved: `${prefix}-[${hex}]`,
    exact: false,
    distance: bestDist,
  };
}

/**
 * Resolve a pixel spacing value to the nearest Tailwind spacing class.
 */
export function resolveSpacing(
  resolver: TokenResolver,
  px: number,
): TokenResolution {
  const exact = resolver.spacingMap.get(px);
  if (exact) {
    return { original: px, resolved: exact, exact: true };
  }

  // Find nearest.
  let bestKey = '';
  let bestDist = Infinity;
  for (const [value, className] of resolver.spacingMap) {
    const dist = Math.abs(px - value);
    if (dist < bestDist) {
      bestDist = dist;
      bestKey = className;
    }
  }

  if (bestDist <= 2 && bestKey) {
    return {
      original: px,
      resolved: bestKey,
      exact: false,
      distance: bestDist,
    };
  }

  return {
    original: px,
    resolved: `[${px}px]`,
    exact: false,
    distance: bestDist,
  };
}

/**
 * Resolve a font size (px) to the nearest Tailwind text-* class.
 */
export function resolveFontSize(
  resolver: TokenResolver,
  px: number,
): TokenResolution {
  const exact = resolver.fontSizeMap.get(px);
  if (exact) {
    return { original: px, resolved: `text-${exact}`, exact: true };
  }

  let bestKey = '';
  let bestDist = Infinity;
  for (const [value, className] of resolver.fontSizeMap) {
    const dist = Math.abs(px - value);
    if (dist < bestDist) {
      bestDist = dist;
      bestKey = className;
    }
  }

  if (bestDist <= 1 && bestKey) {
    return {
      original: px,
      resolved: `text-${bestKey}`,
      exact: false,
      distance: bestDist,
    };
  }

  return {
    original: px,
    resolved: `text-[${px}px]`,
    exact: false,
    distance: bestDist,
  };
}

/**
 * Resolve a border-radius (px) to the nearest Tailwind rounded-* class.
 */
export function resolveRadius(
  resolver: TokenResolver,
  px: number,
): TokenResolution {
  const exact = resolver.radiusMap.get(px);
  if (exact) {
    return { original: px, resolved: exact, exact: true };
  }

  let bestKey = '';
  let bestDist = Infinity;
  for (const [value, className] of resolver.radiusMap) {
    const dist = Math.abs(px - value);
    if (dist < bestDist) {
      bestDist = dist;
      bestKey = className;
    }
  }

  if (bestDist <= 1 && bestKey) {
    return {
      original: px,
      resolved: bestKey,
      exact: false,
      distance: bestDist,
    };
  }

  return {
    original: px,
    resolved: `rounded-[${px}px]`,
    exact: false,
    distance: bestDist,
  };
}

// ─── Map builders ────────────────────────────────────────────────────────────

function buildColorMap(
  colors: Record<string, string>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const [name, hex] of Object.entries(colors)) {
    if (typeof hex === 'string' && hex.startsWith('#')) {
      map.set(normalizeHex(hex), name);
    }
  }
  return map;
}

function buildSpacingMap(
  spacing: Record<string, string>,
): Map<number, string> {
  const map = new Map<number, string>();
  for (const [name, value] of Object.entries(spacing)) {
    const px = remToPx(value);
    if (px !== null) map.set(px, name);
  }
  return map;
}

function buildFontSizeMap(
  fontSize: Record<string, string>,
): Map<number, string> {
  const map = new Map<number, string>();
  for (const [name, value] of Object.entries(fontSize)) {
    const px = remToPx(value);
    if (px !== null) map.set(px, name);
  }
  return map;
}

function buildRadiusMap(
  borderRadius: Record<string, string>,
): Map<number, string> {
  const map = new Map<number, string>();
  for (const [name, value] of Object.entries(borderRadius)) {
    const px = remToPx(value);
    if (px !== null) {
      const className =
        name === 'DEFAULT' ? 'rounded' : `rounded-${name}`;
      map.set(px, className);
    }
  }
  return map;
}

function buildShadowMap(
  boxShadow: Record<string, string>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const [name, value] of Object.entries(boxShadow)) {
    const className =
      name === 'DEFAULT' ? 'shadow' : `shadow-${name}`;
    map.set(value, className);
  }
  return map;
}

/**
 * Convert a CSS value like `1rem`, `0.5rem`, `16px`, `1px` to pixels.
 * Returns null for values it can't parse (e.g. `9999px`).
 */
function remToPx(value: string): number | null {
  if (value === '0' || value === '0px') return 0;

  const remMatch = value.match(/^([\d.]+)rem$/);
  if (remMatch) return parseFloat(remMatch[1]) * 16;

  const pxMatch = value.match(/^([\d.]+)px$/);
  if (pxMatch) {
    const px = parseFloat(pxMatch[1]);
    if (px > 9000) return null; // e.g. `9999px` for `full`
    return px;
  }

  return null;
}
