/**
 * Response parser — extracts TSX code from Claude's response text.
 * Claude is instructed to output a single fenced code block, but
 * we handle edge cases like multiple blocks or unfenced output.
 */

/**
 * Extract TSX source code from Claude's response.
 * Tries fenced blocks first, falls back to raw content.
 */
export function extractTSX(response: string): string {
  // Try fenced code blocks (```tsx or ```typescript or ```)
  const fencedPatterns = [
    /```tsx\s*\n([\s\S]*?)```/,
    /```typescript\s*\n([\s\S]*?)```/,
    /```jsx\s*\n([\s\S]*?)```/,
    /```\s*\n([\s\S]*?)```/,
  ];

  for (const pattern of fencedPatterns) {
    const match = response.match(pattern);
    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }

  // If the entire response looks like code (starts with import/export/const/function)
  const trimmed = response.trim();
  if (
    /^(import |export |'use client'|"use client"|const |function |interface )/.test(
      trimmed,
    )
  ) {
    return trimmed;
  }

  throw new Error(
    'Could not extract TSX from Claude response. ' +
      'The response did not contain a recognizable code block.',
  );
}

/**
 * Extract the component name from TSX source code.
 * Looks for `export default function Foo` or `export default Foo`.
 */
export function extractComponentName(tsx: string): string | null {
  // export default function ComponentName
  const fnMatch = tsx.match(
    /export\s+default\s+function\s+(\w+)/,
  );
  if (fnMatch) return fnMatch[1];

  // function ComponentName ... export default ComponentName
  const defaultExport = tsx.match(/export\s+default\s+(\w+)/);
  if (defaultExport) return defaultExport[1];

  // const ComponentName = ... \n export default ComponentName
  const constMatch = tsx.match(
    /const\s+(\w+)\s*[=:][\s\S]*export\s+default\s+\1/,
  );
  if (constMatch) return constMatch[1];

  return null;
}
