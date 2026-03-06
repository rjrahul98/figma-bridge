/**
 * Image exporter — high-level helper for exporting Figma frames
 * as reference PNGs for visual comparison.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { FigmaClient } from './client.js';
import { logger } from '../utils/logger.js';

export interface ExportReferenceOptions {
  /** Scale factor (default: 2 for retina). */
  scale?: number;
  /** Save the image to this path (optional). */
  saveTo?: string;
}

/**
 * Export a Figma frame as a reference PNG.
 * Returns the raw image buffer.
 */
export async function exportReferenceImage(
  client: FigmaClient,
  fileId: string,
  nodeId: string,
  options: ExportReferenceOptions = {},
): Promise<Buffer> {
  const { scale = 2, saveTo } = options;

  const spinner = logger.spinner('Exporting reference image from Figma...');

  try {
    const buffer = await client.exportImage(fileId, [nodeId], {
      scale,
      format: 'png',
    });

    if (saveTo) {
      const absPath = resolve(process.cwd(), saveTo);
      const dir = dirname(absPath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(absPath, buffer);
      spinner.succeed(`Reference image saved to ${saveTo}`);
    } else {
      spinner.succeed('Reference image exported');
    }

    return buffer;
  } catch (error) {
    spinner.fail('Failed to export reference image');
    throw error;
  }
}

/**
 * Convert a PNG buffer to a base64 data URI.
 */
export function bufferToBase64(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString('base64')}`;
}
