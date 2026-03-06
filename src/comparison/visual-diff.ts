/**
 * Visual diff engine — compares two PNG screenshots pixel-by-pixel
 * using pixelmatch and returns a diff image + mismatch percentage.
 */

import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

export interface VisualDiffResult {
  /** Number of mismatched pixels. */
  mismatchedPixels: number;
  /** Total pixels compared. */
  totalPixels: number;
  /** Mismatch ratio (0–1). */
  mismatchRatio: number;
  /** Score (0–100, where 100 = perfect match). */
  score: number;
  /** Diff image as a PNG buffer (red = mismatched pixels). */
  diffImage: Buffer;
}

/**
 * Compare two PNG buffers and produce a visual diff.
 */
export function compareImages(
  expected: Buffer,
  actual: Buffer,
  options: { threshold?: number } = {},
): VisualDiffResult {
  const { threshold = 0.1 } = options;

  const img1 = PNG.sync.read(expected);
  const img2 = PNG.sync.read(actual);

  // Resize to the smaller dimensions for comparison.
  const width = Math.min(img1.width, img2.width);
  const height = Math.min(img1.height, img2.height);

  // Crop both images to the comparison area.
  const data1 = cropImageData(img1, width, height);
  const data2 = cropImageData(img2, width, height);

  const diff = new PNG({ width, height });

  const mismatchedPixels = pixelmatch(
    data1,
    data2,
    diff.data,
    width,
    height,
    { threshold, includeAA: false },
  );

  const totalPixels = width * height;
  const mismatchRatio = mismatchedPixels / totalPixels;
  const score = Math.round((1 - mismatchRatio) * 100);

  return {
    mismatchedPixels,
    totalPixels,
    mismatchRatio,
    score,
    diffImage: PNG.sync.write(diff),
  };
}

/**
 * Crop image data to a target width × height, taking the
 * top-left region.
 */
function cropImageData(
  img: PNG,
  targetWidth: number,
  targetHeight: number,
): Buffer {
  if (img.width === targetWidth && img.height === targetHeight) {
    return img.data as unknown as Buffer;
  }

  const cropped = Buffer.alloc(targetWidth * targetHeight * 4);
  for (let y = 0; y < targetHeight; y++) {
    const srcOffset = y * img.width * 4;
    const destOffset = y * targetWidth * 4;
    img.data.copy(cropped, destOffset, srcOffset, srcOffset + targetWidth * 4);
  }

  return cropped;
}
