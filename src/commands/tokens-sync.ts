/**
 * `figma-bridge tokens sync` — re-parse tailwind.config and rebuild
 * the token map cached at `.figma-bridge/token-map.json`.
 */

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig } from '../config/loader.js';
import { parseTailwindConfig } from '../context/tailwind-parser.js';
import { buildTokenResolver } from '../context/token-resolver.js';
import { logger } from '../utils/logger.js';

const TOKEN_MAP_PATH = '.figma-bridge/token-map.json';

export async function tokensSyncCommand(): Promise<void> {
  const config = await loadConfig();

  const spinner = logger.spinner('Parsing Tailwind config...');
  const theme = await parseTailwindConfig(config.paths.tailwindConfig);
  spinner.succeed('Tailwind config parsed');

  const resolver = buildTokenResolver(theme);

  // Serialize the resolver maps to JSON for caching.
  const serialized = {
    colors: Object.fromEntries(resolver.colorMap),
    spacing: Object.fromEntries(resolver.spacingMap),
    fontSize: Object.fromEntries(resolver.fontSizeMap),
    borderRadius: Object.fromEntries(resolver.radiusMap),
    boxShadow: Object.fromEntries(resolver.shadowMap),
  };

  const outPath = resolve(process.cwd(), TOKEN_MAP_PATH);
  const dir = resolve(process.cwd(), '.figma-bridge');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  writeFileSync(outPath, JSON.stringify(serialized, null, 2), 'utf-8');

  logger.success(`Token map written to ${TOKEN_MAP_PATH}`);
  logger.table({
    Colors: resolver.colorMap.size,
    Spacing: resolver.spacingMap.size,
    'Font sizes': resolver.fontSizeMap.size,
    'Border radii': resolver.radiusMap.size,
    Shadows: resolver.shadowMap.size,
  });
}
