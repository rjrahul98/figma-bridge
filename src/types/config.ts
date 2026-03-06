/**
 * Configuration schema for figma-bridge.config.ts
 */

export interface FigmaBridgeConfig {
  figma: {
    accessToken: string;
    fileId?: string;
  };

  paths: {
    /** Path to the existing component library (for scanning). */
    components: string;
    /** Directory where generated components are written. */
    output: string;
    /** Tailwind config path (auto-detected by init). */
    tailwindConfig: string;
    /** Global CSS file that imports Tailwind layers. */
    globalCss?: string;
  };

  /** Manual token overrides — merged on top of auto‑resolved tokens. */
  tokens?: {
    colors?: Record<string, string>;
    spacing?: Record<string, string>;
    borderRadius?: Record<string, string>;
    shadows?: Record<string, string>;
    typography?: Record<string, string>;
  };

  /**
   * Map Figma component names to local component imports.
   * e.g. `{ "Icon/Arrow": "@/components/icons/Arrow" }`
   */
  componentMap?: Record<string, string>;

  /** Per-component prop/variant overrides. */
  componentProps?: Record<
    string,
    {
      variantMap: Record<string, string>;
      valueTransform?: Record<string, (v: string) => string>;
    }
  >;

  agent: {
    /** Claude model to use for generation. */
    model: string;
    /** Maximum self-correction iterations. */
    maxIterations: number;
    /** Stop iterating once this score is reached (0–100). */
    targetScore: number;
    /** Include pixel-level visual diff in feedback. */
    includeVisualDiff: boolean;
    /** Include property-level comparison in feedback. */
    includePropertyDiff: boolean;
    /** Model temperature. */
    temperature: number;
    /** Anthropic API key (falls back to ANTHROPIC_API_KEY env). */
    apiKey?: string;
  };

  audit: {
    /** Base URL of the local dev server. */
    devServerUrl: string;
    /** Acceptable deviation thresholds. */
    tolerance: {
      /** Spacing tolerance in px. */
      spacing: number;
      /** Color tolerance as Delta-E. */
      color: number;
      /** Font-size tolerance in px. */
      fontSize: number;
    };
    /** CSS selectors to ignore during audit. */
    ignore?: string[];
  };

  scaffold: {
    /** Import path style for generated components. */
    importStyle: 'absolute' | 'relative' | 'alias';
    /** Import alias prefix (e.g. `@/components`). */
    importAlias?: string;
    /** Run Prettier on generated code. */
    prettier: boolean;
    /** Route used for the in-browser preview harness. */
    previewRoute?: string;
  };
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_CONFIG: Omit<FigmaBridgeConfig, 'figma' | 'paths'> = {
  agent: {
    model: 'claude-sonnet-4-5-20250514',
    maxIterations: 3,
    targetScore: 95,
    includeVisualDiff: true,
    includePropertyDiff: true,
    temperature: 0,
  },
  audit: {
    devServerUrl: 'http://localhost:3000',
    tolerance: {
      spacing: 2,
      color: 5,
      fontSize: 0,
    },
  },
  scaffold: {
    importStyle: 'alias',
    prettier: true,
    previewRoute: '/__figma-bridge-preview',
  },
};
