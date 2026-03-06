/**
 * Prettier formatting utility for generated TSX output.
 */

import prettier from 'prettier';

/**
 * Format TypeScript/TSX source code with Prettier.
 * Falls back to the unformatted source if Prettier throws.
 */
export async function formatCode(source: string): Promise<string> {
  try {
    return await prettier.format(source, {
      parser: 'typescript',
      semi: true,
      singleQuote: true,
      trailingComma: 'all',
      printWidth: 80,
      tabWidth: 2,
      jsxSingleQuote: false,
    });
  } catch {
    return source;
  }
}
