/**
 * `figma-bridge init` — interactive first-run setup.
 *
 * 1. Prompts for Figma access token, default file ID, paths.
 * 2. Auto-detects tailwind.config.{ts,js} if present.
 * 3. Writes `figma-bridge.config.ts` to the project root.
 * 4. Creates the `.figma-bridge/` cache directory.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { logger } from '../utils/logger.js';

// ─── Tailwind detection ─────────────────────────────────────────────────────

const TAILWIND_CANDIDATES = [
  'tailwind.config.ts',
  'tailwind.config.js',
  'tailwind.config.mjs',
  'tailwind.config.cjs',
];

function detectTailwindConfig(): string | null {
  for (const candidate of TAILWIND_CANDIDATES) {
    if (existsSync(resolve(process.cwd(), candidate))) {
      return candidate;
    }
  }
  return null;
}

// ─── Prompt definitions ─────────────────────────────────────────────────────

interface InitAnswers {
  figmaAccessToken: string;
  fileId: string;
  componentsPath: string;
  outputPath: string;
  useTailwind: boolean;
  tailwindConfig: string;
  importStyle: 'absolute' | 'relative' | 'alias';
  importAlias: string;
  devServerUrl: string;
}

async function promptUser(
  detectedTailwind: string | null,
): Promise<InitAnswers> {
  console.log();
  console.log(
    chalk.bold('  Welcome to ') +
      chalk.cyan.bold('figma-bridge') +
      chalk.bold(' setup!'),
  );
  console.log(
    chalk.dim(
      '  This will create a figma-bridge.config.ts in your project root.',
    ),
  );
  console.log();

  const answers = await inquirer.prompt<InitAnswers>([
    {
      type: 'password',
      name: 'figmaAccessToken',
      message: 'Figma access token (https://figma.com/developers/api#access-tokens):',
      mask: '*',
      validate: (input: string) =>
        input.length > 0 || 'A Figma access token is required.',
    },
    {
      type: 'input',
      name: 'fileId',
      message: 'Default Figma file ID (optional):',
      default: '',
    },
    {
      type: 'input',
      name: 'componentsPath',
      message: 'Path to your existing components directory:',
      default: './src/components',
    },
    {
      type: 'input',
      name: 'outputPath',
      message: 'Output directory for generated components:',
      default: './src/generated',
    },
    ...(detectedTailwind
      ? [
          {
            type: 'confirm' as const,
            name: 'useTailwind' as const,
            message: `Found ${chalk.cyan(detectedTailwind)}. Use it for token resolution?`,
            default: true,
          },
        ]
      : []),
    {
      type: 'input',
      name: 'tailwindConfig',
      message: 'Path to tailwind config:',
      default: detectedTailwind ?? './tailwind.config.ts',
      when: (ans: Partial<InitAnswers>) =>
        detectedTailwind === null || ans.useTailwind === true,
    },
    {
      type: 'list',
      name: 'importStyle',
      message: 'Import style for generated components:',
      choices: [
        { name: 'Alias (e.g. @/components/Button)', value: 'alias' },
        { name: 'Relative (e.g. ../components/Button)', value: 'relative' },
        { name: 'Absolute (e.g. src/components/Button)', value: 'absolute' },
      ],
      default: 'alias',
    },
    {
      type: 'input',
      name: 'importAlias',
      message: 'Import alias prefix:',
      default: '@/components',
      when: (ans: Partial<InitAnswers>) => ans.importStyle === 'alias',
    },
    {
      type: 'input',
      name: 'devServerUrl',
      message: 'Dev server URL (for audit command):',
      default: 'http://localhost:3000',
    },
  ]);

  // Fill in defaults for conditional questions.
  if (!answers.tailwindConfig) {
    answers.tailwindConfig = detectedTailwind ?? './tailwind.config.ts';
  }
  if (!answers.importAlias) {
    answers.importAlias = '@/components';
  }
  if (answers.useTailwind === undefined) {
    answers.useTailwind = false;
  }

  return answers;
}

// ─── Config file generation ─────────────────────────────────────────────────

function generateConfigSource(answers: InitAnswers): string {
  const fileIdLine = answers.fileId
    ? `\n    fileId: '${answers.fileId}',`
    : '';

  const aliasLine =
    answers.importStyle === 'alias'
      ? `\n    importAlias: '${answers.importAlias}',`
      : '';

  return `import { type FigmaBridgeConfig } from 'figma-bridge';

const config: FigmaBridgeConfig = {
  figma: {
    accessToken: process.env.FIGMA_ACCESS_TOKEN ?? '',${fileIdLine}
  },

  paths: {
    components: '${answers.componentsPath}',
    output: '${answers.outputPath}',
    tailwindConfig: '${answers.tailwindConfig}',
  },

  agent: {
    model: 'claude-sonnet-4-5-20250514',
    maxIterations: 3,
    targetScore: 95,
    includeVisualDiff: true,
    includePropertyDiff: true,
    temperature: 0,
  },

  audit: {
    devServerUrl: '${answers.devServerUrl}',
    tolerance: {
      spacing: 2,
      color: 5,
      fontSize: 0,
    },
  },

  scaffold: {
    importStyle: '${answers.importStyle}',${aliasLine}
    prettier: true,
    previewRoute: '/__figma-bridge-preview',
  },
};

export default config;
`;
}

// ─── .env suggestion ────────────────────────────────────────────────────────

function generateEnvLine(token: string): string {
  return `FIGMA_ACCESS_TOKEN=${token}`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

export async function initCommand(): Promise<void> {
  const configPath = resolve(process.cwd(), 'figma-bridge.config.ts');

  // Guard: don't overwrite an existing config without confirmation.
  if (existsSync(configPath)) {
    const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>([
      {
        type: 'confirm',
        name: 'overwrite',
        message:
          'figma-bridge.config.ts already exists. Overwrite it?',
        default: false,
      },
    ]);

    if (!overwrite) {
      logger.info('Init cancelled — existing config preserved.');
      return;
    }
  }

  // Detect environment.
  const detectedTailwind = detectTailwindConfig();
  if (detectedTailwind) {
    logger.info(`Detected Tailwind config: ${chalk.cyan(detectedTailwind)}`);
  }

  // Run interactive prompts.
  const answers = await promptUser(detectedTailwind);

  // Write config file.
  const configSource = generateConfigSource(answers);
  writeFileSync(configPath, configSource, 'utf-8');
  logger.success(`Created ${chalk.cyan('figma-bridge.config.ts')}`);

  // Create .figma-bridge/ cache directory.
  const cacheDir = resolve(process.cwd(), '.figma-bridge');
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }

  // Write a .gitignore inside .figma-bridge/.
  const gitignorePath = resolve(cacheDir, '.gitignore');
  if (!existsSync(gitignorePath)) {
    writeFileSync(
      gitignorePath,
      `# figma-bridge cache — do not commit\n*\n!.gitignore\n`,
      'utf-8',
    );
  }
  logger.success(`Created ${chalk.cyan('.figma-bridge/')} cache directory`);

  // Suggest .env setup.
  console.log();
  logger.header('Next steps');
  logger.info(
    `Add your Figma token to ${chalk.cyan('.env')} (keep it out of source control):`,
  );
  console.log();
  console.log(chalk.dim(`    ${generateEnvLine(answers.figmaAccessToken)}`));
  console.log();

  // Suggest adding .figma-bridge to .gitignore.
  const rootGitignore = resolve(process.cwd(), '.gitignore');
  if (existsSync(rootGitignore)) {
    const gitignoreContent = (
      await import('node:fs')
    ).readFileSync(rootGitignore, 'utf-8');
    if (!gitignoreContent.includes('.figma-bridge')) {
      logger.info(
        `Add ${chalk.cyan('.figma-bridge/')} to your ${chalk.cyan('.gitignore')}`,
      );
    }
  }

  logger.info(
    `Run ${chalk.cyan('figma-bridge scaffold --url <figma-url>')} to generate your first component!`,
  );
  console.log();
}
