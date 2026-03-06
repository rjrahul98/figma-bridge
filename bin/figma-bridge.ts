/**
 * figma-bridge CLI — Agent-Driven Figma-to-Code tool.
 *
 * Usage:
 *   figma-bridge init
 *   figma-bridge scaffold --url <figma-url> [options]
 *   figma-bridge audit    --url <figma-url> --page <route> [options]
 *   figma-bridge tokens sync
 *   figma-bridge components scan
 */

import { Command } from 'commander';
import { initCommand } from '../src/commands/init.js';
import { scaffoldCommand } from '../src/commands/scaffold.js';
import { tokensSyncCommand } from '../src/commands/tokens-sync.js';
import { componentsScanCommand } from '../src/commands/components-scan.js';
import { logger } from '../src/utils/logger.js';

function handleError(error: unknown): never {
  logger.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const program = new Command('figma-bridge')
  .version('2.0.0')
  .description('Agent-Driven Figma-to-Code CLI');

// ─── init ────────────────────────────────────────────────────────────────────

program
  .command('init')
  .description(
    'Interactive setup: create config, detect tailwind, scan components',
  )
  .action(async () => {
    try {
      await initCommand();
    } catch (error) {
      handleError(error);
    }
  });

// ─── scaffold ────────────────────────────────────────────────────────────────

program
  .command('scaffold')
  .description('Generate a React component from a Figma frame')
  .requiredOption('--url <url>', 'Figma frame URL')
  .option('--out <path>', 'Output file path')
  .option('--name <name>', 'Component name')
  .option('--dry-run', 'Print to terminal instead of writing file', false)
  .option('--no-cache', 'Skip Figma API cache')
  .option('--no-vision', 'Skip image input to Claude')
  .option('--iterations <n>', 'Override max iterations', parseInt)
  .option('--score <n>', 'Override target score', parseInt)
  .option('--verbose', 'Show iteration details', false)
  .action(async (options) => {
    try {
      await scaffoldCommand(options);
    } catch (error) {
      handleError(error);
    }
  });

// ─── audit ───────────────────────────────────────────────────────────────────

program
  .command('audit')
  .description('Compare rendered page against Figma designs')
  .requiredOption('--url <url>', 'Figma frame URL')
  .requiredOption('--page <route>', 'Dev server route to audit')
  .option('--server <url>', 'Dev server base URL')
  .option('--selector <sel>', 'CSS selector scope', 'body')
  .option(
    '--format <fmt>',
    'Output format: terminal | json | summary',
    'terminal',
  )
  .option('--min-score <n>', 'Minimum pass score', parseInt)
  .option('--ai', 'Include AI-assisted interpretation', false)
  .option('--strict', 'Zero tolerance mode', false)
  .action(async (_options) => {
    logger.warn('audit command is not yet implemented (Phase 3).');
    process.exit(0);
  });

// ─── tokens sync ─────────────────────────────────────────────────────────────

const tokensCmd = program
  .command('tokens')
  .description('Design token management');

tokensCmd
  .command('sync')
  .description('Re-sync tokens from tailwind.config')
  .action(async () => {
    try {
      await tokensSyncCommand();
    } catch (error) {
      handleError(error);
    }
  });

// ─── components scan ─────────────────────────────────────────────────────────

const componentsCmd = program
  .command('components')
  .description('Component library management');

componentsCmd
  .command('scan')
  .description('Re-scan the component directory and rebuild the index')
  .action(async () => {
    try {
      await componentsScanCommand();
    } catch (error) {
      handleError(error);
    }
  });

// ─── Parse & run ─────────────────────────────────────────────────────────────

program.parse(process.argv);
