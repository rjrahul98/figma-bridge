/**
 * Normalized design node tree — a cleaned-up, framework-agnostic
 * representation of the Figma node tree, ready for prompt assembly.
 */

export interface DesignNode {
  id: string;
  name: string;
  type:
    | 'frame'
    | 'text'
    | 'component-instance'
    | 'vector'
    | 'image'
    | 'group'
    | 'rectangle'
    | 'ellipse'
    | 'line';

  layout: {
    mode: 'flex-row' | 'flex-col' | 'grid' | 'absolute' | 'none';
    gap: number;
    padding: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    mainAxisAlign: 'start' | 'center' | 'end' | 'space-between';
    crossAxisAlign: 'start' | 'center' | 'end' | 'stretch';
    wrap: boolean;
  };

  size: {
    width: {
      value: number;
      mode: 'fixed' | 'fill' | 'hug';
    };
    height: {
      value: number;
      mode: 'fixed' | 'fill' | 'hug';
    };
  };

  position?: {
    x: number;
    y: number;
  };

  styles: {
    fills: Array<{
      type: 'solid' | 'gradient';
      color: string;
      opacity: number;
    }>;
    strokes: Array<{
      color: string;
      weight: number;
      align: 'inside' | 'outside' | 'center';
    }>;
    borderRadius: {
      tl: number;
      tr: number;
      bl: number;
      br: number;
    };
    effects: Array<{
      type: 'drop-shadow' | 'inner-shadow' | 'blur';
      params: Record<string, unknown>;
    }>;
    opacity: number;
  };

  text?: {
    content: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    lineHeight: number | 'auto';
    letterSpacing: number;
    textAlign: 'left' | 'center' | 'right' | 'justify';
    textDecoration: 'none' | 'underline' | 'line-through';
    figmaStyleName?: string;
  };

  componentInstance?: {
    componentName: string;
    componentSetName?: string;
    variantProperties: Record<string, string>;
  };

  /** Resolved design tokens (e.g. `{ "bg": "bg-blue-500" }`) */
  tokens?: Record<string, string>;

  children: DesignNode[];
}
