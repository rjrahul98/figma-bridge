/**
 * Design token types — used by the token resolver to map
 * Figma design values to Tailwind utility classes.
 */

// ─── Token Entries ───────────────────────────────────────────────────────────

export interface ColorToken {
  /** Hex or RGB value. */
  value: string;
  /** Mapped Tailwind class (e.g. `bg-blue-500`). */
  tailwindClass: string;
  description?: string;
}

export interface SpacingToken {
  /** Pixel value. */
  value: number;
  /** Mapped Tailwind class (e.g. `gap-4`). */
  tailwindClass: string;
  description?: string;
}

export interface TypographyToken {
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  /** Mapped Tailwind classes (e.g. `['text-lg', 'font-semibold']`). */
  tailwindClasses: string[];
  description?: string;
}

export interface BorderRadiusToken {
  /** Pixel value. */
  value: number;
  /** Mapped Tailwind class (e.g. `rounded-lg`). */
  tailwindClass: string;
  description?: string;
}

export interface ShadowToken {
  offsetX: number;
  offsetY: number;
  blurRadius: number;
  spreadRadius: number;
  /** Hex color. */
  color: string;
  /** Mapped Tailwind class (e.g. `shadow-lg`). */
  tailwindClass: string;
  description?: string;
}

// ─── Aggregated Map ──────────────────────────────────────────────────────────

export interface DesignTokens {
  colors: Record<string, ColorToken>;
  spacing: Record<string, SpacingToken>;
  typography: Record<string, TypographyToken>;
  borderRadius: Record<string, BorderRadiusToken>;
  shadows: Record<string, ShadowToken>;
}

// ─── Token Resolver ──────────────────────────────────────────────────────────

export interface TokenResolver {
  colorMap: Map<string, string>;
  spacingMap: Map<number, string>;
  fontSizeMap: Map<number, string>;
  shadowMap: Map<string, string>;
  radiusMap: Map<number, string>;
}

export interface TokenResolution {
  /** The original Figma value. */
  original: string | number;
  /** The resolved Tailwind utility class. */
  resolved: string;
  /** `true` when an exact match was found; `false` for nearest-neighbor. */
  exact: boolean;
  /** Distance metric (only present for numeric types). */
  distance?: number;
}
