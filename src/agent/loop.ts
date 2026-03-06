/**
 * Agent loop — the core iterative generation engine.
 *
 * 1. Send the design tree + context to Claude for initial TSX generation.
 * 2. Parse the response to extract TSX.
 * 3. Run static feedback analysis (Phase 3 adds visual/property diff).
 * 4. If score < target and iterations remain, send feedback to Claude
 *    for refinement. Repeat.
 * 5. Return the best TSX and final score.
 */

import type { DesignNode } from '../types/design-node.js';
import type { FigmaBridgeConfig } from '../types/config.js';
import type { ComponentIndex } from '../types/component-index.js';
import type { AgentLoopState } from '../types/report.js';
import type { TokenResolver } from '../types/tokens.js';
import type { StyleExample } from '../context/style-examples.js';
import { ClaudeClient, type ClaudeMessage } from './claude-client.js';
import {
  buildSystemPrompt,
  buildRefineSystemPrompt,
  buildInitialUserMessage,
  buildRefinementMessage,
  type BuildUserMessageOptions,
} from './prompt-builder.js';
import { extractTSX } from './response-parser.js';
import { buildStaticFeedback } from './feedback-builder.js';
import { logger } from '../utils/logger.js';

// ─── Options ─────────────────────────────────────────────────────────────────

export interface AgentLoopOptions {
  config: FigmaBridgeConfig;
  designTree: DesignNode;
  componentName: string;
  referenceImageBase64?: string;
  tokenResolver?: TokenResolver;
  componentIndex?: ComponentIndex;
  styleExamples?: StyleExample[];

  /** Override config.agent.maxIterations. */
  maxIterations?: number;
  /** Override config.agent.targetScore. */
  targetScore?: number;
  /** Log iteration details. */
  verbose?: boolean;
}

export interface AgentLoopResult {
  tsx: string;
  score: number;
  iterations: number;
  converged: boolean;
}

// ─── Loop ────────────────────────────────────────────────────────────────────

export async function runAgentLoop(
  options: AgentLoopOptions,
): Promise<AgentLoopResult> {
  const {
    config,
    designTree,
    componentName,
    referenceImageBase64,
    tokenResolver,
    componentIndex,
    styleExamples,
    verbose = false,
  } = options;

  const maxIterations =
    options.maxIterations ?? config.agent.maxIterations;
  const targetScore =
    options.targetScore ?? config.agent.targetScore;

  const claude = new ClaudeClient(config.agent);

  // ── Iteration 1: initial generation ──────────────────────────────────

  const spinner = logger.spinner('Generating component with Claude...');

  const systemPrompt = buildSystemPrompt(config);
  const userMsgOptions: BuildUserMessageOptions = {
    designTree,
    componentName,
    tokenResolver,
    componentIndex,
    styleExamples,
    referenceImageBase64,
    componentMap: config.componentMap,
  };
  const initialMessage = buildInitialUserMessage(userMsgOptions);

  const messages: ClaudeMessage[] = [initialMessage];

  const response = await claude.generate({
    system: systemPrompt,
    messages,
  });

  let tsx = extractTSX(response);
  messages.push({ role: 'assistant', content: response });

  // Static feedback for iteration 1.
  let feedback = buildStaticFeedback(tsx, designTree);

  const state: AgentLoopState = {
    iteration: 1,
    currentTSX: tsx,
    feedback,
    score: feedback.overallScore,
    isConverged: feedback.overallScore >= targetScore,
  };

  if (verbose) {
    spinner.stop();
    logger.info(`Iteration 1: score ${feedback.overallScore}/100`);
    if (feedback.mismatches.length) {
      logger.warn(`  ${feedback.mismatches.length} mismatches`);
    }
    if (feedback.missingElements.length) {
      logger.warn(`  ${feedback.missingElements.length} missing elements`);
    }
  }

  if (state.isConverged) {
    spinner.succeed(
      `Component generated — score ${state.score}/100 (1 iteration)`,
    );
    return {
      tsx: state.currentTSX,
      score: state.score,
      iterations: 1,
      converged: true,
    };
  }

  // ── Iterations 2..N: refinement ────────────────────────────────────

  let bestTSX = tsx;
  let bestScore = feedback.overallScore;

  for (let i = 2; i <= maxIterations; i++) {
    if (!verbose) {
      spinner.text = `Refining component (iteration ${i}/${maxIterations})...`;
    } else {
      logger.spinner(`Refining (iteration ${i}/${maxIterations})...`);
    }

    const refinementMsg = buildRefinementMessage(tsx, feedback);
    messages.push(refinementMsg);

    const refineResponse = await claude.generate({
      system: buildRefineSystemPrompt(),
      messages,
    });

    try {
      tsx = extractTSX(refineResponse);
    } catch {
      // If parsing fails, keep the previous best.
      if (verbose) logger.warn(`  Iteration ${i}: failed to parse TSX`);
      break;
    }

    messages.push({ role: 'assistant', content: refineResponse });

    feedback = buildStaticFeedback(tsx, designTree);

    if (verbose) {
      logger.info(`Iteration ${i}: score ${feedback.overallScore}/100`);
    }

    // Track best.
    if (feedback.overallScore > bestScore) {
      bestScore = feedback.overallScore;
      bestTSX = tsx;
    }

    if (feedback.overallScore >= targetScore) {
      spinner.succeed(
        `Component refined — score ${feedback.overallScore}/100 (${i} iterations)`,
      );
      return {
        tsx,
        score: feedback.overallScore,
        iterations: i,
        converged: true,
      };
    }
  }

  spinner.succeed(
    `Component generated — score ${bestScore}/100 (${maxIterations} iterations, ` +
      `target was ${targetScore})`,
  );

  return {
    tsx: bestTSX,
    score: bestScore,
    iterations: maxIterations,
    converged: false,
  };
}
