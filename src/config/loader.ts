/**
 * Configuration loader — uses cosmiconfig to find and load
 * `figma-bridge.config.{ts,js,json}` from the project root,
 * with TypeScript support via jiti.
 */

import { cosmiconfig } from 'cosmiconfig';
import { type FigmaBridgeConfig, DEFAULT_CONFIG } from '../types/config.js';
import { logger } from '../utils/logger.js';

const MODULE_NAME = 'figma-bridge';

/**
 * Create a cosmiconfig explorer that supports `.ts` config files
 * via jiti (a fast, TypeScript-aware module loader).
 */
function createExplorer() {
  return cosmiconfig(MODULE_NAME, {
    searchPlaces: [
      `${MODULE_NAME}.config.ts`,
      `${MODULE_NAME}.config.js`,
      `${MODULE_NAME}.config.mjs`,
      `${MODULE_NAME}.config.json`,
      `.${MODULE_NAME}rc`,
      `.${MODULE_NAME}rc.json`,
    ],
    loaders: {
      '.ts': async (filepath: string) => {
        const { default: createJiti } = await import('jiti');
        const loader = createJiti(process.cwd(), {
          interopDefault: true,
        });
        return loader(filepath);
      },
    },
  });
}

/**
 * Deep-merge two objects. Arrays are replaced (not concatenated).
 */
function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const result = { ...target };

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceVal = source[key];
    const targetVal = target[key];

    if (
      sourceVal &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      ) as T[keyof T];
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal as T[keyof T];
    }
  }

  return result;
}

/**
 * Load the project configuration.
 *
 * Searches upward from `cwd` for a config file, merges the found
 * values on top of `DEFAULT_CONFIG`, and validates required fields.
 *
 * @throws {Error} if no config file is found.
 */
export async function loadConfig(
  cwd?: string,
): Promise<FigmaBridgeConfig> {
  const explorer = createExplorer();
  const result = cwd
    ? await explorer.search(cwd)
    : await explorer.search();

  if (!result || result.isEmpty) {
    throw new Error(
      `No figma-bridge config found.\n` +
        `  Run \`figma-bridge init\` to create one, or add a ` +
        `figma-bridge.config.ts to your project root.`,
    );
  }

  logger.debug(`Config loaded from ${result.filepath}`);

  const userConfig = result.config as Partial<FigmaBridgeConfig>;

  // Merge defaults under user config.
  const merged = deepMerge(
    DEFAULT_CONFIG as unknown as Record<string, unknown>,
    userConfig as Record<string, unknown>,
  ) as unknown as FigmaBridgeConfig;

  // Validate required fields.
  if (!merged.figma?.accessToken) {
    // Allow env-var fallback.
    const envToken = process.env['FIGMA_ACCESS_TOKEN'];
    if (envToken) {
      merged.figma = { ...merged.figma, accessToken: envToken };
    } else {
      throw new Error(
        `Missing figma.accessToken in config.\n` +
          `  Set it in figma-bridge.config.ts or export FIGMA_ACCESS_TOKEN.`,
      );
    }
  }

  return merged;
}

/**
 * Try to load config, returning `null` instead of throwing
 * when no config file exists.
 */
export async function tryLoadConfig(): Promise<FigmaBridgeConfig | null> {
  try {
    return await loadConfig();
  } catch {
    return null;
  }
}
