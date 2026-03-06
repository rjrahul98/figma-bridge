/**
 * `figma-bridge components scan` — re-scan the component directory
 * and rebuild the cached component index at
 * `.figma-bridge/component-index.json`.
 */

import { loadConfig } from '../config/loader.js';
import {
  scanComponents,
  saveCachedIndex,
} from '../context/component-indexer.js';
import { logger } from '../utils/logger.js';

export async function componentsScanCommand(): Promise<void> {
  const config = await loadConfig();

  const index = await scanComponents(config.paths.components, {
    importStyle: config.scaffold.importStyle,
    importAlias: config.scaffold.importAlias,
  });

  saveCachedIndex(index);

  logger.success(`Indexed ${index.length} components`);

  if (index.length > 0) {
    logger.newline();
    for (const entry of index.slice(0, 20)) {
      const propsCount = entry.props.length;
      logger.kv(
        entry.name,
        `${entry.importPath} (${propsCount} props)`,
      );
    }
    if (index.length > 20) {
      logger.info(`... and ${index.length - 20} more`);
    }
  }
}
