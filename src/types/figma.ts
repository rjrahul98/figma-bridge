/**
 * Raw Figma API response types — direct mappings from the Figma REST API.
 */

// ─── API Response ────────────────────────────────────────────────────────────

export interface FigmaAPIResponse {
  document: {
    id: string;
    name: string;
    children: FigmaNode[];
  };
  components: Record<string, FigmaComponent>;
  styles: Record<string, FigmaStyle>;
}

// ─── Node ────────────────────────────────────────────────────────────────────

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  locked?: boolean;

  // Geometry
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;

  // Fills & strokes
  fills?: FigmaFill[];
  strokes?: FigmaStroke[];
  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';

  // Corners
  cornerRadius?: number;
  cornerSmoothing?: number;
  rectangleCornerRadii?: [number, number, number, number];

  // Auto‑layout
  layoutMode?: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';
  counterAxisSizingMode?: 'FIXED' | 'AUTO';
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH';
  layoutWrap?: 'NO_WRAP' | 'WRAP';
  itemSpacing?: number;
  counterAxisSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;

  // Effects
  effects?: FigmaEffect[];
  opacity?: number;

  // Text
  characters?: string;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  lineHeightPx?: number;
  lineHeightPercent?: number;
  letterSpacing?: number;
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textDecoration?: 'NONE' | 'STRIKETHROUGH' | 'UNDERLINE';
  textAutoResize?: 'NONE' | 'HEIGHT' | 'WIDTH_AND_HEIGHT' | 'TRUNCATE';

  // Component
  componentId?: string;
  componentSetId?: string;
  componentProperties?: Record<string, FigmaComponentProperty>;

  // Sizing constraints
  constraints?: {
    vertical: 'TOP' | 'BOTTOM' | 'CENTER' | 'TOP_BOTTOM' | 'SCALE';
    horizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'LEFT_RIGHT' | 'SCALE';
  };
  layoutSizingHorizontal?: 'FIXED' | 'HUG' | 'FILL';
  layoutSizingVertical?: 'FIXED' | 'HUG' | 'FILL';

  // Children
  children?: FigmaNode[];

  // Styles references
  styles?: Record<string, string>;
}

// ─── Fills ───────────────────────────────────────────────────────────────────

export interface FigmaFill {
  type:
    | 'SOLID'
    | 'GRADIENT_LINEAR'
    | 'GRADIENT_RADIAL'
    | 'GRADIENT_ANGULAR'
    | 'GRADIENT_DIAMOND'
    | 'IMAGE'
    | 'EMOJI';
  visible?: boolean;
  opacity?: number;
  color?: FigmaColor;
  blendMode?: string;
  gradientStops?: FigmaGradientStop[];
  gradientHandlePositions?: FigmaVector[];
  imageRef?: string;
  scaleMode?: 'FILL' | 'FIT' | 'CROP' | 'TILE';
}

export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface FigmaGradientStop {
  position: number;
  color: FigmaColor;
}

export interface FigmaVector {
  x: number;
  y: number;
}

// ─── Strokes ─────────────────────────────────────────────────────────────────

export interface FigmaStroke {
  type:
    | 'SOLID'
    | 'GRADIENT_LINEAR'
    | 'GRADIENT_RADIAL'
    | 'GRADIENT_ANGULAR'
    | 'GRADIENT_DIAMOND';
  visible?: boolean;
  opacity?: number;
  color?: FigmaColor;
}

// ─── Effects ─────────────────────────────────────────────────────────────────

export interface FigmaEffect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  visible?: boolean;
  blendMode?: string;
  offset?: FigmaVector;
  radius?: number;
  color?: FigmaColor;
  spread?: number;
}

// ─── Components ──────────────────────────────────────────────────────────────

export interface FigmaComponent {
  id: string;
  name: string;
  description?: string;
  containing_frame_id?: string;
  containing_frame_offset?: FigmaVector;
  key: string;
  documentationLinks?: Array<{ uri: string; title?: string }>;
}

export interface FigmaComponentProperty {
  type: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT';
  value: string | boolean;
  preferredValues?: Array<{ type: string; key: string }>;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

export interface FigmaStyle {
  id: string;
  name: string;
  description?: string;
  remote: boolean;
  styleType: 'PAINT' | 'TEXT' | 'EFFECT' | 'GRID';
  key: string;
}

// ─── File Metadata ───────────────────────────────────────────────────────────

export interface FigmaFileMetadata {
  id: string;
  name: string;
  lastModified: string;
  editorType: string;
  thumbnailUrl?: string;
  version?: string;
}

// ─── Image Export ────────────────────────────────────────────────────────────

export interface FigmaImageExportOptions {
  scale?: number;
  format?: 'png' | 'jpg' | 'svg' | 'pdf';
}

export interface FigmaImageResponse {
  images: Record<string, string>; // nodeId -> URL
  err: string | null;
}
