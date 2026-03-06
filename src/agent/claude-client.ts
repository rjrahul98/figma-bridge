/**
 * Claude API client wrapper — thin layer over the Anthropic SDK
 * that handles model selection, temperature, and message formatting
 * for the figma-bridge agent loop.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { FigmaBridgeConfig } from '../types/config.js';
import { logger } from '../utils/logger.js';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ClaudeContentBlock[];
}

export type ClaudeContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: 'image/png'; data: string } };

export interface ClaudeRequestOptions {
  system: string;
  messages: ClaudeMessage[];
  maxTokens?: number;
}

export class ClaudeClient {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly temperature: number;

  constructor(config: FigmaBridgeConfig['agent']) {
    const apiKey = config.apiKey ?? process.env['ANTHROPIC_API_KEY'];
    if (!apiKey) {
      throw new Error(
        'Missing Anthropic API key. Set agent.apiKey in config or export ANTHROPIC_API_KEY.',
      );
    }

    this.client = new Anthropic({ apiKey });
    this.model = config.model;
    this.temperature = config.temperature;
  }

  /**
   * Send a message to Claude and return the text response.
   */
  async generate(options: ClaudeRequestOptions): Promise<string> {
    const { system, messages, maxTokens = 16_384 } = options;

    logger.debug(`Claude API → ${this.model} (${messages.length} messages)`);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      temperature: this.temperature,
      system,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content as Anthropic.Messages.ContentBlockParam[] | string,
      })),
    });

    const textBlocks = response.content
      .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
      .map((block) => block.text);

    const result = textBlocks.join('\n');

    logger.debug(
      `Claude API ← ${result.length} chars, ` +
        `${response.usage.input_tokens} in / ${response.usage.output_tokens} out`,
    );

    return result;
  }
}
