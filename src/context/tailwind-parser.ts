/**
 * Tailwind config parser — reads a tailwind.config.{ts,js} file and
 * extracts the theme values (colors, spacing, fontSize, borderRadius,
 * boxShadow) into flat maps that the token resolver can use.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { logger } from '../utils/logger.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TailwindTheme {
  colors: Record<string, string>;
  spacing: Record<string, string>;
  fontSize: Record<string, string>;
  borderRadius: Record<string, string>;
  boxShadow: Record<string, string>;
}

// ─── Tailwind defaults ──────────────────────────────────────────────────────

const DEFAULT_SPACING: Record<string, string> = {
  '0': '0px', '0.5': '0.125rem', '1': '0.25rem', '1.5': '0.375rem',
  '2': '0.5rem', '2.5': '0.625rem', '3': '0.75rem', '3.5': '0.875rem',
  '4': '1rem', '5': '1.25rem', '6': '1.5rem', '7': '1.75rem',
  '8': '2rem', '9': '2.25rem', '10': '2.5rem', '11': '2.75rem',
  '12': '3rem', '14': '3.5rem', '16': '4rem', '20': '5rem',
  '24': '6rem', '28': '7rem', '32': '8rem', '36': '9rem',
  '40': '10rem', '44': '11rem', '48': '12rem', '52': '13rem',
  '56': '14rem', '60': '15rem', '64': '16rem', '72': '18rem',
  '80': '20rem', '96': '24rem', px: '1px',
};

const DEFAULT_FONT_SIZE: Record<string, string> = {
  xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem',
  xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem',
  '5xl': '3rem', '6xl': '3.75rem', '7xl': '4.5rem', '8xl': '6rem',
  '9xl': '8rem',
};

const DEFAULT_BORDER_RADIUS: Record<string, string> = {
  none: '0px', sm: '0.125rem', DEFAULT: '0.25rem', md: '0.375rem',
  lg: '0.5rem', xl: '0.75rem', '2xl': '1rem', '3xl': '1.5rem',
  full: '9999px',
};

const DEFAULT_BOX_SHADOW: Record<string, string> = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',
};

const DEFAULT_COLORS: Record<string, string> = {
  'slate-50': '#f8fafc', 'slate-100': '#f1f5f9', 'slate-200': '#e2e8f0',
  'slate-300': '#cbd5e1', 'slate-400': '#94a3b8', 'slate-500': '#64748b',
  'slate-600': '#475569', 'slate-700': '#334155', 'slate-800': '#1e293b',
  'slate-900': '#0f172a', 'slate-950': '#020617',
  'gray-50': '#f9fafb', 'gray-100': '#f3f4f6', 'gray-200': '#e5e7eb',
  'gray-300': '#d1d5db', 'gray-400': '#9ca3af', 'gray-500': '#6b7280',
  'gray-600': '#4b5563', 'gray-700': '#374151', 'gray-800': '#1f2937',
  'gray-900': '#111827', 'gray-950': '#030712',
  'red-50': '#fef2f2', 'red-100': '#fee2e2', 'red-200': '#fecaca',
  'red-300': '#fca5a5', 'red-400': '#f87171', 'red-500': '#ef4444',
  'red-600': '#dc2626', 'red-700': '#b91c1c', 'red-800': '#991b1b',
  'red-900': '#7f1d1d', 'red-950': '#450a0a',
  'orange-50': '#fff7ed', 'orange-500': '#f97316',
  'yellow-50': '#fefce8', 'yellow-500': '#eab308',
  'green-50': '#f0fdf4', 'green-100': '#dcfce7', 'green-200': '#bbf7d0',
  'green-300': '#86efac', 'green-400': '#4ade80', 'green-500': '#22c55e',
  'green-600': '#16a34a', 'green-700': '#15803d', 'green-800': '#166534',
  'green-900': '#14532d', 'green-950': '#052e16',
  'blue-50': '#eff6ff', 'blue-100': '#dbeafe', 'blue-200': '#bfdbfe',
  'blue-300': '#93c5fd', 'blue-400': '#60a5fa', 'blue-500': '#3b82f6',
  'blue-600': '#2563eb', 'blue-700': '#1d4ed8', 'blue-800': '#1e40af',
  'blue-900': '#1e3a8a', 'blue-950': '#172554',
  'indigo-50': '#eef2ff', 'indigo-500': '#6366f1',
  'purple-50': '#faf5ff', 'purple-500': '#a855f7',
  'pink-50': '#fdf2f8', 'pink-500': '#ec4899',
  white: '#ffffff', black: '#000000', transparent: 'transparent',
};

// ─── Parser ──────────────────────────────────────────────────────────────────

/**
 * Parse a tailwind.config file and return a flat TailwindTheme.
 * Falls back to Tailwind default values if no config is found.
 */
export async function parseTailwindConfig(
  configPath: string,
): Promise<TailwindTheme> {
  const absPath = resolve(process.cwd(), configPath);

  if (!existsSync(absPath)) {
    logger.warn(
      `Tailwind config not found at ${configPath} — using built-in defaults.`,
    );
    return defaultTheme();
  }

  try {
    const { default: createJiti } = await import('jiti');
    const loader = createJiti(process.cwd(), { interopDefault: true });
    const config = loader(absPath) as Record<string, unknown>;
    const theme = (config.theme ?? {}) as Record<string, unknown>;
    const extend = (theme.extend ?? {}) as Record<string, unknown>;

    return {
      colors: {
        ...DEFAULT_COLORS,
        ...flattenColors(theme.colors as Record<string, unknown> | undefined),
        ...flattenColors(extend.colors as Record<string, unknown> | undefined),
      },
      spacing: {
        ...DEFAULT_SPACING,
        ...flattenValues(theme.spacing as Record<string, string> | undefined),
        ...flattenValues(extend.spacing as Record<string, string> | undefined),
      },
      fontSize: {
        ...DEFAULT_FONT_SIZE,
        ...flattenValues(theme.fontSize as Record<string, string> | undefined),
        ...flattenValues(extend.fontSize as Record<string, string> | undefined),
      },
      borderRadius: {
        ...DEFAULT_BORDER_RADIUS,
        ...flattenValues(theme.borderRadius as Record<string, string> | undefined),
        ...flattenValues(extend.borderRadius as Record<string, string> | undefined),
      },
      boxShadow: {
        ...DEFAULT_BOX_SHADOW,
        ...flattenValues(theme.boxShadow as Record<string, string> | undefined),
        ...flattenValues(extend.boxShadow as Record<string, string> | undefined),
      },
    };
  } catch (error) {
    logger.warn(`Failed to parse Tailwind config: ${error}. Using defaults.`);
    return defaultTheme();
  }
}

function defaultTheme(): TailwindTheme {
  return {
    colors: { ...DEFAULT_COLORS },
    spacing: { ...DEFAULT_SPACING },
    fontSize: { ...DEFAULT_FONT_SIZE },
    borderRadius: { ...DEFAULT_BORDER_RADIUS },
    boxShadow: { ...DEFAULT_BOX_SHADOW },
  };
}

/**
 * Flatten nested color objects: `{ blue: { 500: '#3b82f6' } }` → `{ 'blue-500': '#3b82f6' }`
 */
function flattenColors(
  obj: Record<string, unknown> | undefined,
  prefix = '',
): Record<string, string> {
  if (!obj) return {};
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}-${key}` : key;

    if (typeof value === 'string') {
      result[fullKey] = value;
    } else if (typeof value === 'object' && value !== null) {
      // Handle DEFAULT key inside nested objects.
      const nested = value as Record<string, unknown>;
      if ('DEFAULT' in nested && typeof nested['DEFAULT'] === 'string') {
        result[fullKey] = nested['DEFAULT'];
      }
      Object.assign(result, flattenColors(nested, fullKey));
    }
  }

  // Remove any 'DEFAULT' suffixed keys.
  delete result[`${prefix}-DEFAULT`];

  return result;
}

function flattenValues(
  obj: Record<string, string> | undefined,
): Record<string, string> {
  if (!obj) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = value;
    } else if (Array.isArray(value) && typeof value[0] === 'string') {
      // fontSize can be [size, { lineHeight }] tuples
      result[key] = value[0];
    }
  }
  return result;
}
