/**
 * `figma-bridge scaffold` — generate a React component from a Figma frame.
 *
 * Orchestrates the full pipeline:
 *   URL parse → Figma fetch → normalize → context assembly → agent loop → write file
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { loadConfig } from '../config/loader.js';
import { FigmaClient } from '../figma/client.js';
import { parseFigmaURL } from '../figma/url-parser.js';
import { normalizeNode, findNodeById } from '../figma/normalizer.js';
import { exportReferenceImage, bufferToBase64 } from '../figma/image-exporter.js';
import { parseTailwindConfig } from '../context/tailwind-parser.js';
import { buildTokenResolver } from '../context/token-resolver.js';
import { loadCachedIndex } from '../context/component-indexer.js';
import { extractStyleExamples } from '../context/style-examples.js';
import { runAgentLoop } from '../agent/loop.js';
import { formatCode } from '../utils/prettier.js';
import { logger } from '../utils/logger.js';

export interface ScaffoldOptions {
  url: string;
  out?: string;
  name?: string;
  dryRun?: boolean;
  cache?: boolean;
  vision?: boolean;
  iterations?: number;
  score?: number;
  verbose?: boolean;
}

export async function scaffoldCommand(options: ScaffoldOptions): Promise<void> {
  const config = await loadConfig();

  // 1. Parse Figma URL
  const { fileId, nodeId } = parseFigmaURL(options.url);
  logger.info(`File: ${fileId} | Node: ${nodeId}`);

  // 2. Fetch Figma data
  const client = new FigmaClient({
    accessToken: config.figma.accessToken,
  });

  const spinner = logger.spinner('Fetching Figma file data...');
  const fileData = await client.getFile(fileId, {
    nodeIds: [nodeId],
    noCache: options.cache === false,
  });
  spinner.succeed('Figma data fetched');

  // 3. Find and normalize the target node
  const rootNode = fileData.document.children[0];
  const targetNode = findNodeById(rootNode, nodeId);
  if (!targetNode) {
    throw new Error(`Node ${nodeId} not found in the Figma file.`);
  }

  const designTree = normalizeNode(targetNode, fileData.components);

  // Determine component name
  const componentName =
    options.name ?? toPascalCase(targetNode.name) ?? 'GeneratedComponent';

  logger.info(`Component: ${componentName}`);

  // 4. Export reference image (unless --no-vision)
  let referenceImageBase64: string | undefined;
  if (options.vision !== false) {
    const imageBuffer = await exportReferenceImage(client, fileId, nodeId);
    referenceImageBase64 = bufferToBase64(imageBuffer).replace(
      /^data:image\/png;base64,/,
      '',
    );
  }

  // 5. Assemble context
  const theme = await parseTailwindConfig(config.paths.tailwindConfig);
  const tokenResolver = buildTokenResolver(theme);

  const componentIndex = loadCachedIndex();
  const styleExamples = componentIndex
    ? extractStyleExamples(componentIndex)
    : undefined;

  // 6. Run agent loop
  const result = await runAgentLoop({
    config,
    designTree,
    componentName,
    referenceImageBase64,
    tokenResolver,
    componentIndex: componentIndex ?? undefined,
    styleExamples,
    maxIterations: options.iterations,
    targetScore: options.score,
    verbose: options.verbose,
  });

  // 7. Format with Prettier
  let output = result.tsx;
  if (config.scaffold.prettier) {
    output = await formatCode(output);
  }

  // 8. Output
  if (options.dryRun || !options.out) {
    console.log('\n' + output);
  } else {
    const outPath = resolve(process.cwd(), options.out);
    const dir = dirname(outPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(outPath, output, 'utf-8');
    logger.success(`Written to ${options.out}`);
  }

  // Summary
  logger.newline();
  logger.table({
    Score: `${result.score}/100`,
    Iterations: result.iterations,
    Converged: result.converged ? 'yes' : 'no',
  });
}

function toPascalCase(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}
