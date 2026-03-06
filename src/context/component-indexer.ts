/**
 * Component indexer — scans a directory of React components and
 * extracts their names, props, and source code using ts-morph.
 * The resulting index is used as prompt context so Claude knows
 * which components are available in the project.
 */

import { resolve } from 'node:path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import fg from 'fast-glob';
import { Project, SyntaxKind } from 'ts-morph';
import type {
  ComponentIndex,
  ComponentIndexEntry,
  ComponentProp,
} from '../types/component-index.js';
import { logger } from '../utils/logger.js';

const CACHE_PATH = '.figma-bridge/component-index.json';

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ScanOptions {
  /** Glob patterns for component files (default: TSX files). */
  patterns?: string[];
  /** Import path style. */
  importStyle: 'absolute' | 'relative' | 'alias';
  /** Alias prefix (e.g. `@/components`). */
  importAlias?: string;
}

/**
 * Scan a directory for React components and return a ComponentIndex.
 */
export async function scanComponents(
  componentsDir: string,
  options: ScanOptions,
): Promise<ComponentIndex> {
  const absDir = resolve(process.cwd(), componentsDir);
  const patterns = options.patterns ?? ['**/*.tsx'];

  const spinner = logger.spinner(
    `Scanning components in ${componentsDir}...`,
  );

  const files = await fg(patterns, {
    cwd: absDir,
    absolute: true,
    ignore: [
      '**/*.test.*',
      '**/*.spec.*',
      '**/*.stories.*',
      '**/__tests__/**',
      '**/node_modules/**',
    ],
  });

  const project = new Project({
    compilerOptions: { jsx: 4 /* JsxEmit.ReactJSX */ },
    skipAddingFilesFromTsConfig: true,
  });

  const index: ComponentIndex = [];

  for (const filePath of files) {
    try {
      const entry = analyzeComponent(project, filePath, absDir, options);
      if (entry) index.push(entry);
    } catch {
      // Skip files that can't be parsed.
    }
  }

  spinner.succeed(`Found ${index.length} components in ${componentsDir}`);

  return index;
}

/**
 * Load a cached component index from disk (if it exists).
 */
export function loadCachedIndex(): ComponentIndex | null {
  const cachePath = resolve(process.cwd(), CACHE_PATH);
  if (!existsSync(cachePath)) return null;

  try {
    return JSON.parse(readFileSync(cachePath, 'utf-8')) as ComponentIndex;
  } catch {
    return null;
  }
}

/**
 * Save the component index to the cache file.
 */
export function saveCachedIndex(index: ComponentIndex): void {
  const cachePath = resolve(process.cwd(), CACHE_PATH);
  const dir = resolve(process.cwd(), '.figma-bridge');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(cachePath, JSON.stringify(index, null, 2), 'utf-8');
  logger.debug(`Component index cached (${index.length} entries)`);
}

// ─── Analysis ────────────────────────────────────────────────────────────────

function analyzeComponent(
  project: Project,
  filePath: string,
  baseDir: string,
  options: ScanOptions,
): ComponentIndexEntry | null {
  const sourceCode = readFileSync(filePath, 'utf-8');
  const sourceFile = project.createSourceFile(filePath, sourceCode, {
    overwrite: true,
  });

  // Look for exported function/arrow components.
  const exportedDeclarations = sourceFile.getExportedDeclarations();
  let componentName: string | null = null;
  let props: ComponentProp[] = [];

  for (const [name, declarations] of exportedDeclarations) {
    for (const decl of declarations) {
      const kind = decl.getKind();

      // function MyComponent(props: Props) { ... }
      if (kind === SyntaxKind.FunctionDeclaration) {
        componentName = name;
        props = extractPropsFromParams(decl);
        break;
      }

      // const MyComponent = (props: Props) => { ... }
      if (kind === SyntaxKind.VariableDeclaration) {
        componentName = name;
        props = extractPropsFromVariable(decl);
        break;
      }
    }
    if (componentName) break;
  }

  if (!componentName) return null;

  // Skip non-component exports (hooks, utils, etc.)
  if (
    componentName.startsWith('use') ||
    componentName[0] !== componentName[0].toUpperCase()
  ) {
    return null;
  }

  const relativePath = filePath
    .replace(baseDir, '')
    .replace(/\\/g, '/')
    .replace(/^\//, '')
    .replace(/\.(tsx?|jsx?)$/, '');

  let importPath: string;
  if (options.importStyle === 'alias' && options.importAlias) {
    importPath = `${options.importAlias}/${relativePath}`;
  } else if (options.importStyle === 'absolute') {
    importPath = relativePath;
  } else {
    importPath = `./${relativePath}`;
  }

  return {
    name: componentName,
    filePath,
    importPath,
    props,
    sourceCode,
  };
}

function extractPropsFromParams(decl: unknown): ComponentProp[] {
  try {
    const fn = decl as { getParameters?: () => unknown[] };
    const params = fn.getParameters?.() ?? [];
    if (params.length === 0) return [];

    const firstParam = params[0] as {
      getType?: () => { getProperties?: () => unknown[] };
    };
    const type = firstParam.getType?.();
    if (!type) return [];

    return extractPropsFromType(type);
  } catch {
    return [];
  }
}

function extractPropsFromVariable(decl: unknown): ComponentProp[] {
  try {
    const variable = decl as {
      getInitializer?: () => {
        getParameters?: () => unknown[];
      } | undefined;
    };
    const init = variable.getInitializer?.();
    if (!init) return [];

    const params = (init as { getParameters?: () => unknown[] })
      .getParameters?.() ?? [];
    if (params.length === 0) return [];

    const firstParam = params[0] as {
      getType?: () => { getProperties?: () => unknown[] };
    };
    const type = firstParam.getType?.();
    if (!type) return [];

    return extractPropsFromType(type);
  } catch {
    return [];
  }
}

function extractPropsFromType(type: {
  getProperties?: () => unknown[];
}): ComponentProp[] {
  const properties = type.getProperties?.() ?? [];
  return properties
    .map((prop) => {
      const p = prop as {
        getName: () => string;
        getTypeAtLocation?: (loc: unknown) => { getText: () => string };
        isOptional?: () => boolean;
        getValueDeclaration?: () => {
          getInitializer?: () => { getText: () => string } | undefined;
        } | undefined;
      };
      try {
        return {
          name: p.getName(),
          type: 'string', // simplified fallback
          required: !(p.isOptional?.() ?? false),
        };
      } catch {
        return null;
      }
    })
    .filter((p): p is ComponentProp => p !== null);
}
