/**
 * Component index types — used by the component scanner
 * to catalog existing project components for prompt context.
 */

export interface ComponentIndexEntry {
  /** Component display name (e.g. `Button`). */
  name: string;
  /** Absolute path on disk. */
  filePath: string;
  /** Import path used in generated code (respects alias config). */
  importPath: string;
  /** Extracted prop definitions. */
  props: ComponentProp[];
  /** Full source code of the component file. */
  sourceCode: string;
}

export interface ComponentProp {
  name: string;
  /** TypeScript type as a string (e.g. `'primary' | 'secondary'`). */
  type: string;
  required: boolean;
  defaultValue?: string;
}

export type ComponentIndex = ComponentIndexEntry[];
