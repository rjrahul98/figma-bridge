/**
 * Figma REST API client.
 *
 * Wraps the Figma v1 API with typed responses, optional caching,
 * and automatic image export.
 */

import {
  type FigmaAPIResponse,
  type FigmaComponent,
  type FigmaFileMetadata,
  type FigmaImageExportOptions,
  type FigmaImageResponse,
  type FigmaStyle,
} from '../types/figma.js';
import { getCached, setCache } from '../utils/cache.js';
import { logger } from '../utils/logger.js';

const FIGMA_API_BASE = 'https://api.figma.com/v1';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FigmaClientOptions {
  accessToken: string;
}

export interface GetFileOptions {
  /** Limit response to specific node IDs. */
  nodeIds?: string[];
  /** Skip the local cache and always fetch from the API. */
  noCache?: boolean;
}

export interface ExportImageOptions extends FigmaImageExportOptions {
  /** Image scale factor (default: 2 for retina). */
  scale?: number;
  /** Image format (default: `png`). */
  format?: 'png' | 'jpg' | 'svg' | 'pdf';
}

// ─── Client ──────────────────────────────────────────────────────────────────

export class FigmaClient {
  private readonly accessToken: string;

  constructor(options: FigmaClientOptions) {
    this.accessToken = options.accessToken;
  }

  // ── Fetch helpers ────────────────────────────────────────────────────────

  private async request<T>(
    path: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${FIGMA_API_BASE}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    logger.debug(`Figma API → GET ${url.pathname}${url.search}`);

    const response = await fetch(url.toString(), {
      headers: {
        'X-Figma-Token': this.accessToken,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Figma API error ${response.status}: ${response.statusText}\n${body}`,
      );
    }

    return response.json() as Promise<T>;
  }

  private async requestBuffer(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to download image: ${response.status} ${response.statusText}`,
      );
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Fetch a Figma file (or a subtree when `nodeIds` is specified).
   * Results are cached for 1 hour by default.
   */
  async getFile(
    fileId: string,
    options: GetFileOptions = {},
  ): Promise<FigmaAPIResponse> {
    const { nodeIds, noCache = false } = options;
    const cacheId = `${fileId}:${(nodeIds ?? []).join(',')}`;

    if (!noCache) {
      const cached = getCached<FigmaAPIResponse>('file', cacheId);
      if (cached) return cached;
    }

    const params: Record<string, string> = { geometry: 'paths' };
    if (nodeIds?.length) {
      params['ids'] = nodeIds.join(',');
    }

    const data = await this.request<FigmaAPIResponse>(
      `/files/${fileId}`,
      params,
    );

    setCache('file', cacheId, data);
    return data;
  }

  /**
   * Export one or more nodes as images and return the raw buffer
   * for the first node.
   */
  async exportImage(
    fileId: string,
    nodeIds: string[],
    options: ExportImageOptions = {},
  ): Promise<Buffer> {
    const { scale = 2, format = 'png' } = options;

    const imageResponse = await this.request<FigmaImageResponse>(
      `/images/${fileId}`,
      {
        ids: nodeIds.join(','),
        scale: String(scale),
        format,
      },
    );

    if (imageResponse.err) {
      throw new Error(`Figma image export error: ${imageResponse.err}`);
    }

    // Download the first image URL.
    const firstUrl = Object.values(imageResponse.images)[0];
    if (!firstUrl) {
      throw new Error('No image URL returned by Figma');
    }

    return this.requestBuffer(firstUrl);
  }

  /**
   * Export images and return a map of nodeId → Buffer.
   */
  async exportImages(
    fileId: string,
    nodeIds: string[],
    options: ExportImageOptions = {},
  ): Promise<Map<string, Buffer>> {
    const { scale = 2, format = 'png' } = options;

    const imageResponse = await this.request<FigmaImageResponse>(
      `/images/${fileId}`,
      {
        ids: nodeIds.join(','),
        scale: String(scale),
        format,
      },
    );

    if (imageResponse.err) {
      throw new Error(`Figma image export error: ${imageResponse.err}`);
    }

    const result = new Map<string, Buffer>();
    await Promise.all(
      Object.entries(imageResponse.images).map(async ([nodeId, url]) => {
        if (url) {
          const buffer = await this.requestBuffer(url);
          result.set(nodeId, buffer);
        }
      }),
    );

    return result;
  }

  /**
   * Get published styles for a file.
   */
  async getStyles(fileId: string): Promise<Record<string, FigmaStyle>> {
    const cached = getCached<Record<string, FigmaStyle>>('styles', fileId);
    if (cached) return cached;

    const data = await this.request<{ meta: { styles: FigmaStyle[] } }>(
      `/files/${fileId}/styles`,
    );

    const map: Record<string, FigmaStyle> = {};
    for (const style of data.meta.styles) {
      map[style.key] = style;
    }

    setCache('styles', fileId, map);
    return map;
  }

  /**
   * Get published components for a file.
   */
  async getComponents(
    fileId: string,
  ): Promise<Record<string, FigmaComponent>> {
    const cached = getCached<Record<string, FigmaComponent>>(
      'components',
      fileId,
    );
    if (cached) return cached;

    const data = await this.request<{
      meta: { components: FigmaComponent[] };
    }>(`/files/${fileId}/components`);

    const map: Record<string, FigmaComponent> = {};
    for (const comp of data.meta.components) {
      map[comp.key] = comp;
    }

    setCache('components', fileId, map);
    return map;
  }

  /**
   * Get lightweight file metadata (name, last modified, etc.).
   */
  async getFileMetadata(fileId: string): Promise<FigmaFileMetadata> {
    const data = await this.request<FigmaFileMetadata>(`/files/${fileId}`, {
      depth: '1',
    });

    return {
      id: fileId,
      name: data.name,
      lastModified: data.lastModified,
      editorType: data.editorType,
      thumbnailUrl: data.thumbnailUrl,
      version: data.version,
    };
  }
}
