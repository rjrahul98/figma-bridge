/**
 * Color conversion and comparison utilities.
 */

import type { FigmaColor } from '../types/figma.js';

/**
 * Convert a Figma RGBA color (0–1 floats) to a hex string.
 * Returns `#RRGGBB` or `#RRGGBBAA` when alpha < 1.
 */
export function figmaColorToHex(color: FigmaColor): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const hex = `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;

  if (color.a !== undefined && color.a < 1) {
    const a = Math.round(color.a * 255);
    return `${hex}${componentToHex(a)}`;
  }

  return hex;
}

/**
 * Convert a Figma RGBA color to an `rgba()` CSS string.
 */
export function figmaColorToRgba(color: FigmaColor): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = color.a ?? 1;
  if (a === 1) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(2))})`;
}

/**
 * Parse a hex string into `{ r, g, b }` (0–255 integers).
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace('#', '');
  if (cleaned.length < 6) return null;
  return {
    r: parseInt(cleaned.slice(0, 2), 16),
    g: parseInt(cleaned.slice(2, 4), 16),
    b: parseInt(cleaned.slice(4, 6), 16),
  };
}

/**
 * Normalise any hex shorthand (`#abc`) to 6-char form (`#aabbcc`)
 * and lowercase.
 */
export function normalizeHex(hex: string): string {
  let h = hex.replace('#', '').toLowerCase();
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  return `#${h.slice(0, 6)}`;
}

function componentToHex(c: number): string {
  return c.toString(16).padStart(2, '0');
}
