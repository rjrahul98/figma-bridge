/**
 * Audit and iteration report types.
 */

// ─── Iteration Feedback ─────────────────────────────────────────────────────

export interface IterationFeedback {
  overallScore: number;
  visualDiffImage?: string; // base64 PNG
  mismatches: Mismatch[];
  missingElements: string[];
  extraElements: string[];
}

export interface Mismatch {
  /** Human-readable element identifier (e.g. "Header > Title text"). */
  element: string;
  /** CSS property or design attribute that diverges. */
  property: string;
  /** Value found in the rendered output. */
  actual: string;
  /** Value expected from the Figma design. */
  expected: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedFix?: string;
}

// ─── Agent Loop State ────────────────────────────────────────────────────────

export interface AgentLoopState {
  iteration: number;
  currentTSX: string;
  feedback: IterationFeedback | null;
  score: number;
  isConverged: boolean;
}

// ─── Audit Report ────────────────────────────────────────────────────────────

export interface AuditReport {
  /** ISO-8601 timestamp. */
  timestamp: string;
  figmaUrl: string;
  pageRoute: string;
  overallScore: number;
  passed: boolean;
  sections: AuditSection[];
}

export interface AuditSection {
  name: string;
  score: number;
  mismatches: Mismatch[];
}
