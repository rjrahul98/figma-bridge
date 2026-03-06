/**
 * Figma URL parser — extracts fileId and nodeId from various
 * Figma URL formats (design/, file/, short-form, etc.).
 */

export interface ParsedFigmaURL {
  fileId: string;
  nodeId: string;
}

/**
 * Supported Figma URL patterns.
 *
 * Figma URLs come in several flavours:
 *   - https://www.figma.com/design/<fileId>/<name>?node-id=<nodeId>
 *   - https://www.figma.com/file/<fileId>/<name>?node-id=<nodeId>
 *   - Short forms without the trailing file name segment
 *
 * Node IDs may use either dash (`1-23`) or colon (`1:23`) separators;
 * we normalise to the colon form for the Figma REST API.
 */
const URL_PATTERNS: RegExp[] = [
  // /design/ with dash-separated node-id
  /figma\.com\/design\/([a-zA-Z0-9]+)\/[^?]*\?.*node-id=([0-9]+-[0-9]+)/,
  // /design/ with colon-separated node-id
  /figma\.com\/design\/([a-zA-Z0-9]+)\/[^?]*\?.*node-id=([0-9]+:[0-9]+)/,
  // /file/ with colon-separated node-id
  /figma\.com\/file\/([a-zA-Z0-9]+)\/[^?]*\?.*node-id=([0-9]+:[0-9]+)/,
  // /file/ with dash-separated node-id
  /figma\.com\/file\/([a-zA-Z0-9]+)\/[^?]*\?.*node-id=([0-9]+-[0-9]+)/,
  // Short /design/ (no file-name segment)
  /figma\.com\/design\/([a-zA-Z0-9]+)\?.*node-id=([0-9]+-[0-9]+)/,
  /figma\.com\/design\/([a-zA-Z0-9]+)\?.*node-id=([0-9]+:[0-9]+)/,
  // Short /file/ (no file-name segment)
  /figma\.com\/file\/([a-zA-Z0-9]+)\?.*node-id=([0-9]+:[0-9]+)/,
  /figma\.com\/file\/([a-zA-Z0-9]+)\?.*node-id=([0-9]+-[0-9]+)/,
];

/**
 * File-only patterns — when a URL has no `node-id` query param
 * we still want to extract the fileId so the caller can decide
 * what to do (e.g. list top-level frames).
 */
const FILE_ONLY_PATTERNS: RegExp[] = [
  /figma\.com\/design\/([a-zA-Z0-9]+)/,
  /figma\.com\/file\/([a-zA-Z0-9]+)/,
];

/**
 * Parse a Figma URL and return the extracted `fileId` and `nodeId`.
 *
 * @throws {Error} If the URL doesn't match any known Figma URL format.
 */
export function parseFigmaURL(url: string): ParsedFigmaURL {
  const cleanURL = decodeURIComponent(url.trim());

  // Try full patterns (with node-id) first.
  for (const pattern of URL_PATTERNS) {
    const match = cleanURL.match(pattern);
    if (match) {
      return {
        fileId: match[1],
        nodeId: normaliseNodeId(match[2]),
      };
    }
  }

  // Fall back to file-only patterns.
  for (const pattern of FILE_ONLY_PATTERNS) {
    const match = cleanURL.match(pattern);
    if (match) {
      throw new Error(
        `Figma URL is missing a node-id query parameter.\n` +
          `  Got: ${url}\n` +
          `  Tip: Open a specific frame in Figma, right-click → "Copy link", ` +
          `and use that URL instead.`,
      );
    }
  }

  throw new Error(
    `Invalid Figma URL: ${url}\n` +
      `  Expected a URL like: https://www.figma.com/design/<fileId>/<name>?node-id=<nodeId>`,
  );
}

/**
 * Normalise a node ID from dash-separated (URL format) to
 * colon-separated (API format).  `"1-23"` → `"1:23"`
 */
function normaliseNodeId(nodeId: string): string {
  return nodeId.replace(/-/, ':');
}

/**
 * Extract just the file ID from a Figma URL (node-id not required).
 */
export function extractFileId(url: string): string {
  const cleanURL = decodeURIComponent(url.trim());

  for (const pattern of [...URL_PATTERNS, ...FILE_ONLY_PATTERNS]) {
    const match = cleanURL.match(pattern);
    if (match) {
      return match[1];
    }
  }

  throw new Error(`Could not extract a Figma file ID from: ${url}`);
}
