/**
 * Figma node normalizer — transforms the raw FigmaNode tree from the
 * REST API into a cleaner, framework-agnostic DesignNode representation
 * suitable for prompt assembly.
 */

import type { FigmaNode, FigmaColor } from '../types/figma.js';
import type { DesignNode } from '../types/design-node.js';
import { figmaColorToHex } from '../utils/color.js';

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Recursively convert a FigmaNode (and its children) into a DesignNode.
 * Hidden nodes (`visible: false`) are skipped entirely.
 */
export function normalizeNode(
  node: FigmaNode,
  components?: Record<string, { name: string }>,
): DesignNode {
  return convertNode(node, components);
}

/**
 * Find a specific node by ID within a Figma document tree.
 */
export function findNodeById(
  root: FigmaNode,
  targetId: string,
): FigmaNode | null {
  if (root.id === targetId) return root;
  for (const child of root.children ?? []) {
    const found = findNodeById(child, targetId);
    if (found) return found;
  }
  return null;
}

// ─── Internal conversion ─────────────────────────────────────────────────────

function convertNode(
  node: FigmaNode,
  components?: Record<string, { name: string }>,
): DesignNode {
  const children = (node.children ?? [])
    .filter((c) => c.visible !== false)
    .map((c) => convertNode(c, components));

  const result: DesignNode = {
    id: node.id,
    name: node.name,
    type: mapNodeType(node),
    layout: extractLayout(node),
    size: extractSize(node),
    styles: extractStyles(node),
    children,
  };

  // Position (only meaningful for absolutely-positioned nodes)
  if (
    node.x !== undefined &&
    node.y !== undefined &&
    result.layout.mode === 'absolute'
  ) {
    result.position = { x: node.x, y: node.y };
  }

  // Text properties
  if (node.type === 'TEXT' && node.characters) {
    result.text = {
      content: node.characters,
      fontFamily: node.fontFamily ?? 'Inter',
      fontSize: node.fontSize ?? 16,
      fontWeight: node.fontWeight ?? 400,
      lineHeight: node.lineHeightPx ?? 'auto',
      letterSpacing: node.letterSpacing ?? 0,
      textAlign: mapTextAlign(node.textAlignHorizontal),
      textDecoration: mapTextDecoration(node.textDecoration),
    };
  }

  // Component instance
  if (node.type === 'INSTANCE' && node.componentId) {
    const compMeta = components?.[node.componentId];
    const variantProps: Record<string, string> = {};
    if (node.componentProperties) {
      for (const [key, prop] of Object.entries(node.componentProperties)) {
        if (prop.type === 'VARIANT') {
          variantProps[key] = String(prop.value);
        }
      }
    }
    result.componentInstance = {
      componentName: compMeta?.name ?? node.name,
      variantProperties: variantProps,
    };
  }

  return result;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

function mapNodeType(node: FigmaNode): DesignNode['type'] {
  const mapping: Record<string, DesignNode['type']> = {
    FRAME: 'frame',
    COMPONENT: 'frame',
    COMPONENT_SET: 'frame',
    INSTANCE: 'component-instance',
    TEXT: 'text',
    VECTOR: 'vector',
    BOOLEAN_OPERATION: 'vector',
    STAR: 'vector',
    LINE: 'line',
    ELLIPSE: 'ellipse',
    RECTANGLE: 'rectangle',
    REGULAR_POLYGON: 'vector',
    GROUP: 'group',
    SECTION: 'frame',
  };
  return mapping[node.type] ?? 'frame';
}

function extractLayout(node: FigmaNode): DesignNode['layout'] {
  const mode = mapLayoutMode(node);
  return {
    mode,
    gap: node.itemSpacing ?? 0,
    padding: {
      top: node.paddingTop ?? 0,
      right: node.paddingRight ?? 0,
      bottom: node.paddingBottom ?? 0,
      left: node.paddingLeft ?? 0,
    },
    mainAxisAlign: mapMainAxisAlign(node.primaryAxisAlignItems),
    crossAxisAlign: mapCrossAxisAlign(node.counterAxisAlignItems),
    wrap: node.layoutWrap === 'WRAP',
  };
}

function mapLayoutMode(node: FigmaNode): DesignNode['layout']['mode'] {
  if (!node.layoutMode || node.layoutMode === 'NONE') {
    // If the node has children but no auto-layout, treat as absolute.
    if (node.children?.length) return 'absolute';
    return 'none';
  }
  return node.layoutMode === 'HORIZONTAL' ? 'flex-row' : 'flex-col';
}

function mapMainAxisAlign(
  align?: string,
): DesignNode['layout']['mainAxisAlign'] {
  switch (align) {
    case 'CENTER':
      return 'center';
    case 'MAX':
      return 'end';
    case 'SPACE_BETWEEN':
      return 'space-between';
    default:
      return 'start';
  }
}

function mapCrossAxisAlign(
  align?: string,
): DesignNode['layout']['crossAxisAlign'] {
  switch (align) {
    case 'CENTER':
      return 'center';
    case 'MAX':
      return 'end';
    case 'STRETCH':
      return 'stretch';
    default:
      return 'start';
  }
}

function extractSize(node: FigmaNode): DesignNode['size'] {
  return {
    width: {
      value: node.width ?? 0,
      mode: mapSizingMode(node.layoutSizingHorizontal),
    },
    height: {
      value: node.height ?? 0,
      mode: mapSizingMode(node.layoutSizingVertical),
    },
  };
}

function mapSizingMode(
  mode?: 'FIXED' | 'HUG' | 'FILL',
): 'fixed' | 'fill' | 'hug' {
  switch (mode) {
    case 'FILL':
      return 'fill';
    case 'HUG':
      return 'hug';
    default:
      return 'fixed';
  }
}

function extractStyles(node: FigmaNode): DesignNode['styles'] {
  return {
    fills: (node.fills ?? [])
      .filter((f) => f.visible !== false && f.type === 'SOLID' && f.color)
      .map((f) => ({
        type: 'solid' as const,
        color: figmaColorToHex(f.color as FigmaColor),
        opacity: f.opacity ?? 1,
      })),
    strokes: (node.strokes ?? [])
      .filter((s) => s.visible !== false && s.color)
      .map((s) => ({
        color: figmaColorToHex(s.color as FigmaColor),
        weight: node.strokeWeight ?? 1,
        align: (node.strokeAlign?.toLowerCase() ?? 'center') as
          | 'inside'
          | 'outside'
          | 'center',
      })),
    borderRadius: extractBorderRadius(node),
    effects: (node.effects ?? [])
      .filter((e) => e.visible !== false)
      .map((e) => ({
        type: mapEffectType(e.type),
        params: {
          offsetX: e.offset?.x ?? 0,
          offsetY: e.offset?.y ?? 0,
          radius: e.radius ?? 0,
          spread: e.spread ?? 0,
          color: e.color ? figmaColorToHex(e.color) : '#000000',
        },
      })),
    opacity: node.opacity ?? 1,
  };
}

function extractBorderRadius(
  node: FigmaNode,
): DesignNode['styles']['borderRadius'] {
  if (node.rectangleCornerRadii) {
    const [tl, tr, br, bl] = node.rectangleCornerRadii;
    return { tl, tr, bl, br };
  }
  const r = node.cornerRadius ?? 0;
  return { tl: r, tr: r, bl: r, br: r };
}

function mapEffectType(
  type: string,
): 'drop-shadow' | 'inner-shadow' | 'blur' {
  switch (type) {
    case 'DROP_SHADOW':
      return 'drop-shadow';
    case 'INNER_SHADOW':
      return 'inner-shadow';
    default:
      return 'blur';
  }
}

function mapTextAlign(
  align?: string,
): 'left' | 'center' | 'right' | 'justify' {
  switch (align) {
    case 'CENTER':
      return 'center';
    case 'RIGHT':
      return 'right';
    case 'JUSTIFIED':
      return 'justify';
    default:
      return 'left';
  }
}

function mapTextDecoration(
  dec?: string,
): 'none' | 'underline' | 'line-through' {
  switch (dec) {
    case 'UNDERLINE':
      return 'underline';
    case 'STRIKETHROUGH':
      return 'line-through';
    default:
      return 'none';
  }
}
