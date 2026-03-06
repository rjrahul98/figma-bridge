/**
 * Simple file-system cache for Figma API responses.
 * Stored under `.figma-bridge/cache/` in the project root.
 */

import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { logger } from './logger.js';

const CACHE_DIR = '.figma-bridge/cache';

/** Default TTL: 1 hour. */
const DEFAULT_TTL_MS = 60 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function ensureCacheDir(): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function cacheKey(namespace: string, identifier: string): string {
  const hash = createHash('sha256')
    .update(`${namespace}:${identifier}`)
    .digest('hex')
    .slice(0, 16);
  return join(CACHE_DIR, `${namespace}-${hash}.json`);
}

export function getCached<T>(
  namespace: string,
  identifier: string,
  ttlMs: number = DEFAULT_TTL_MS,
): T | null {
  const path = cacheKey(namespace, identifier);
  if (!existsSync(path)) return null;

  try {
    const raw = readFileSync(path, 'utf-8');
    const entry: CacheEntry<T> = JSON.parse(raw);

    if (Date.now() - entry.timestamp > ttlMs) {
      logger.debug(`Cache expired for ${namespace}:${identifier}`);
      return null;
    }

    logger.debug(`Cache hit for ${namespace}:${identifier}`);
    return entry.data;
  } catch {
    return null;
  }
}

export function setCache<T>(
  namespace: string,
  identifier: string,
  data: T,
): void {
  ensureCacheDir();
  const path = cacheKey(namespace, identifier);
  const entry: CacheEntry<T> = { data, timestamp: Date.now() };
  writeFileSync(path, JSON.stringify(entry), 'utf-8');
  logger.debug(`Cached ${namespace}:${identifier}`);
}

export function clearCache(): void {
  if (existsSync(CACHE_DIR)) {
    rmSync(CACHE_DIR, { recursive: true });
    logger.debug('Cache cleared');
  }
}
