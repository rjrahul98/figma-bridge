/**
 * DOM node representation — used by the comparison engine to
 * validate rendered output against the Figma design.
 */

export interface DOMNode {
  selector: string;
  tagName: string;
  computedStyles: Record<string, string>;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  children: DOMNode[];
  textContent?: string;
}
