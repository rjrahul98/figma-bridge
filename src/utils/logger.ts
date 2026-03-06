/**
 * Structured logger — wraps chalk + ora for consistent CLI output.
 */

import chalk from 'chalk';
import ora, { type Ora } from 'ora';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LOG_ORDER: LogLevel[] = ['debug', 'info', 'warn', 'error', 'silent'];

let currentLevel: LogLevel = 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_ORDER.indexOf(level) >= LOG_ORDER.indexOf(currentLevel);
}

export const logger = {
  /** Set the minimum log level. */
  setLevel(level: LogLevel): void {
    currentLevel = level;
  },

  debug(message: string, ...args: unknown[]): void {
    if (shouldLog('debug')) {
      console.log(chalk.gray(`  [debug] ${message}`), ...args);
    }
  },

  info(message: string, ...args: unknown[]): void {
    if (shouldLog('info')) {
      console.log(chalk.blue('  ℹ'), message, ...args);
    }
  },

  success(message: string, ...args: unknown[]): void {
    if (shouldLog('info')) {
      console.log(chalk.green('  ✔'), message, ...args);
    }
  },

  warn(message: string, ...args: unknown[]): void {
    if (shouldLog('warn')) {
      console.warn(chalk.yellow('  ⚠'), message, ...args);
    }
  },

  error(message: string, ...args: unknown[]): void {
    if (shouldLog('error')) {
      console.error(chalk.red('  ✖'), message, ...args);
    }
  },

  /** Print a blank line (respects silent mode). */
  newline(): void {
    if (shouldLog('info')) {
      console.log();
    }
  },

  /** Print a section header. */
  header(title: string): void {
    if (shouldLog('info')) {
      console.log();
      console.log(chalk.bold.underline(title));
      console.log();
    }
  },

  /** Start a spinner. Returns the ora instance so the caller can stop it. */
  spinner(text: string): Ora {
    return ora({ text, color: 'cyan' }).start();
  },

  /** Pretty-print a key/value pair. */
  kv(key: string, value: string | number | boolean): void {
    if (shouldLog('info')) {
      console.log(`  ${chalk.dim(key + ':')} ${value}`);
    }
  },

  /** Pretty-print a table of key/value pairs. */
  table(entries: Record<string, string | number | boolean>): void {
    if (!shouldLog('info')) return;
    const maxKeyLen = Math.max(...Object.keys(entries).map((k) => k.length));
    for (const [key, value] of Object.entries(entries)) {
      console.log(`  ${chalk.dim(key.padEnd(maxKeyLen) + ':')} ${value}`);
    }
  },
};
