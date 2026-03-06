/**
 * Prompt builder — assembles the system prompt and user message
 * for the initial scaffold generation and subsequent refinement
 * iterations. Combines design node tree, token maps, component
 * index, and style examples into a single comprehensive context.
 */

import type { DesignNode } from '../types/design-node.js';
import type { FigmaBridgeConfig } from '../types/config.js';
import type { ComponentIndex } from '../types/component-index.js';
import type { IterationFeedback } from '../types/report.js';
import type { TokenResolver } from '../types/tokens.js';
import type { StyleExample } from '../context/style-examples.js';
import type { ClaudeMessage, ClaudeContentBlock } from './claude-client.js';

// ─── System prompts ──────────────────────────────────────────────────────────

export function buildSystemPrompt(config: FigmaBridgeConfig): string {
  const importInstruction =
    config.scaffold.importStyle === 'alias'
      ? `Use import alias "${config.scaffold.importAlias}" for component imports.`
      : config.scaffold.importStyle === 'absolute'
        ? 'Use absolute imports from the project root.'
        : 'Use relative imports.';

  return `You are an expert React + Tailwind CSS developer. Your job is to convert
Figma design specifications into production-quality React TSX components.

RULES:
1. Output ONLY a single TSX code block. No explanations outside the code block.
2. Use Tailwind CSS utility classes exclusively — no inline styles, no CSS modules.
3. Match the Figma design EXACTLY: spacing, colors, typography, border radius, shadows.
4. Use semantic HTML elements (nav, main, section, article, header, footer, button, etc.).
5. Components must be fully self-contained with a default export.
6. Use the existing component library when a matching component exists.
7. ${importInstruction}
8. All text content from the design must be included as-is.
9. Use responsive-friendly patterns (flex, grid) — avoid fixed pixel widths on containers.
10. Include proper TypeScript types for any props.

When you receive feedback about mismatches, fix ONLY the specific issues mentioned.
Do not restructure working parts of the component.`;
}

export function buildRefineSystemPrompt(): string {
  return `You are refining a React + Tailwind component to better match a Figma design.
You will receive the current TSX code and specific feedback about visual mismatches.

RULES:
1. Output ONLY the complete updated TSX code block. No explanations.
2. Fix ONLY the issues described in the feedback. Do not restructure working code.
3. Preserve the existing component structure and logic.
4. Use exact Tailwind classes suggested in the feedback when provided.
5. If a color, spacing, or size mismatch is reported, use the expected value.`;
}

// ─── User messages ───────────────────────────────────────────────────────────

export interface BuildUserMessageOptions {
  designTree: DesignNode;
  componentName: string;
  tokenResolver?: TokenResolver;
  componentIndex?: ComponentIndex;
  styleExamples?: StyleExample[];
  referenceImageBase64?: string;
  componentMap?: Record<string, string>;
}

/**
 * Build the initial user message for component generation.
 */
export function buildInitialUserMessage(
  options: BuildUserMessageOptions,
): ClaudeMessage {
  const {
    designTree,
    componentName,
    componentIndex,
    styleExamples,
    referenceImageBase64,
    componentMap,
  } = options;

  const parts: string[] = [];

  parts.push(`Generate a React component named "${componentName}".`);
  parts.push('');

  // Design tree (JSON)
  parts.push('## Figma Design Tree');
  parts.push('```json');
  parts.push(JSON.stringify(designTree, null, 2));
  parts.push('```');
  parts.push('');

  // Component map
  if (componentMap && Object.keys(componentMap).length > 0) {
    parts.push('## Component Mapping');
    parts.push(
      'These Figma component names map to existing project components:',
    );
    parts.push('```json');
    parts.push(JSON.stringify(componentMap, null, 2));
    parts.push('```');
    parts.push('');
  }

  // Available components
  if (componentIndex?.length) {
    parts.push('## Available Components');
    parts.push(
      'These components are available in the project. Use them when appropriate:',
    );
    for (const comp of componentIndex.slice(0, 15)) {
      const propsStr = comp.props
        .map(
          (p) =>
            `${p.name}${p.required ? '' : '?'}: ${p.type}`,
        )
        .join(', ');
      parts.push(
        `- \`${comp.name}\` from \`${comp.importPath}\` — props: { ${propsStr} }`,
      );
    }
    parts.push('');
  }

  // Style examples
  if (styleExamples?.length) {
    parts.push('## Code Style Examples');
    parts.push(
      'Follow the patterns used in these existing components:',
    );
    for (const example of styleExamples) {
      parts.push(`### ${example.name} (${example.importPath})`);
      parts.push('```tsx');
      parts.push(example.snippet);
      parts.push('```');
      parts.push('');
    }
  }

  const textContent = parts.join('\n');

  // If we have a reference image, include it as a vision block.
  if (referenceImageBase64) {
    const content: ClaudeContentBlock[] = [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: referenceImageBase64,
        },
      },
      { type: 'text', text: textContent },
    ];
    return { role: 'user', content };
  }

  return { role: 'user', content: textContent };
}

/**
 * Build a refinement message with feedback from the comparison engine.
 */
export function buildRefinementMessage(
  currentTSX: string,
  feedback: IterationFeedback,
  visualDiffBase64?: string,
): ClaudeMessage {
  const parts: string[] = [];

  parts.push(`## Current Score: ${feedback.overallScore}/100`);
  parts.push('');

  if (feedback.mismatches.length > 0) {
    parts.push('## Mismatches to Fix');
    for (const m of feedback.mismatches) {
      parts.push(
        `- **[${m.severity}]** ${m.element} → \`${m.property}\`: ` +
          `got \`${m.actual}\`, expected \`${m.expected}\`` +
          (m.suggestedFix ? ` → fix: \`${m.suggestedFix}\`` : ''),
      );
    }
    parts.push('');
  }

  if (feedback.missingElements.length > 0) {
    parts.push('## Missing Elements');
    for (const el of feedback.missingElements) {
      parts.push(`- ${el}`);
    }
    parts.push('');
  }

  if (feedback.extraElements.length > 0) {
    parts.push('## Extra Elements (remove or verify)');
    for (const el of feedback.extraElements) {
      parts.push(`- ${el}`);
    }
    parts.push('');
  }

  parts.push('## Current TSX');
  parts.push('```tsx');
  parts.push(currentTSX);
  parts.push('```');
  parts.push('');
  parts.push('Fix the issues listed above and output the complete updated TSX.');

  const textContent = parts.join('\n');

  if (visualDiffBase64) {
    const content: ClaudeContentBlock[] = [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: visualDiffBase64,
        },
      },
      { type: 'text', text: textContent },
    ];
    return { role: 'user', content };
  }

  return { role: 'user', content: textContent };
}
